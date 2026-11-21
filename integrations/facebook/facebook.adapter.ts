import { readMetaPermissions } from '../meta-permissions';
import { PlatformAdapter, OAuthUrlParams, OAuthTokenResult, PublishRequest, PublishResult } from '../types';

export class FacebookAdapter implements PlatformAdapter {
  platform = 'facebook' as const;

  private get appId(): string {
    return process.env.META_APP_ID || '';
  }

  private get appSecret(): string {
    return process.env.META_APP_SECRET || '';
  }

  getAuthorizationUrl({ redirectUri, state }: OAuthUrlParams): string {
    if (!this.appId) {
      throw new Error('META_APP_ID is not configured');
    }

    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'public_profile',
    ];

    if (process.env.META_ENABLE_INSIGHTS === "true") scopes.push("read_insights");
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      state: state,
      response_type: 'code',
      scope: scopes.join(','),
    });

    return `https://www.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/dialog/oauth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokenResult> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code: code,
    });

    const tokenRes = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/oauth/access_token?${params.toString()}`);
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Facebook OAuth Token Exchange Failed: ${tokenRes.status} - ${err}`);
    }

    const tokenData = await tokenRes.json();
    const userAccessToken = tokenData.access_token;

    // Exchange for long-lived user token
    const longLivedParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: userAccessToken,
    });

    const longLivedRes = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/oauth/access_token?${longLivedParams.toString()}`);
    const longLivedData = longLivedRes.ok ? await longLivedRes.json() : tokenData;
    const finalUserToken = longLivedData.access_token || userAccessToken;

    const grantedScopes = await readMetaPermissions(finalUserToken, ["pages_show_list", "pages_read_engagement", "pages_manage_posts"]);
    // Discover Facebook Pages managed by user
    const pagesRes = await fetch(
      `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/me/accounts?fields=id,name,access_token,category,picture,tasks&access_token=${finalUserToken}`
    );

    if (!pagesRes.ok) {
      throw new Error('Failed to retrieve user managed Facebook Pages.');
    }

    const pagesData = await pagesRes.json();
    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No managed Facebook Pages found for this account. Automated publishing requires a managed Facebook Page.');
    }

    // Select primary page (or first available)
    const primaryPage = pagesData.data.find((page: { access_token?: string; tasks?: string[] }) =>
      page.access_token && page.tasks?.some((task) => task === "CREATE_CONTENT" || task === "MANAGE"));
    if (!primaryPage) throw new Error("No Facebook Page grants content publishing access");
    const pageAccessToken = primaryPage.access_token;
    const pageId = primaryPage.id;
    const pageName = primaryPage.name;
    const avatarUrl = primaryPage.picture?.data?.url;

    return {
      accessToken: pageAccessToken, // Use Page Access Token so publishing is perpetual and authorized for the Page
      expiresInSeconds: 0, // Page tokens obtained from 60-day user tokens do not expire
      externalAccountId: pageId,
      accountName: `${pageName} (Page)`,
      accountHandle: `@${pageName.replace(/\s+/g, '').toLowerCase()}`,
      avatarUrl,
      grantedScopes,
      rawMetadata: { pageId, pageName },
    };
  }

  async validateToken(accessToken: string, accountId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${accountId}?fields=id,name&access_token=${accessToken}`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    const { text, mediaUrl, mediaType, accessToken, accountId } = request;

    try {
      let endpoint = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${accountId}/feed`;
      const bodyParams = new URLSearchParams({
        access_token: accessToken,
      });

      if (mediaUrl) {
        if (mediaType === 'video') {
          endpoint = `https://graph-video.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${accountId}/videos`;
          bodyParams.append('description', text);
          bodyParams.append('file_url', mediaUrl);
        } else if (mediaUrl.startsWith('data:')) {
          endpoint = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${accountId}/photos`;
          const commaIdx = mediaUrl.indexOf(',');
          const header = mediaUrl.substring(0, commaIdx);
          const b64 = mediaUrl.substring(commaIdx + 1);
          let mime = 'image/jpeg';
          const mimeMatch = header.match(/data:([^;]+)/);
          if (mimeMatch) mime = mimeMatch[1];
          const buf = Buffer.from(b64, 'base64');
          const blob = new Blob([buf], { type: mime });
          const formData = new FormData();
          formData.append('access_token', accessToken);
          formData.append('caption', text);
          formData.append('source', blob, 'post-image.jpg');

          const res = await fetch(endpoint, {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            return {
              success: false,
              errorCode: `FB_PUBLISH_FAILED_${res.status}`,
              errorMessage: errJson.error?.message || `Facebook publishing failed with status ${res.status}`,
              rawResponse: errJson,
            };
          }

          const data = await res.json();
          const postId = data.post_id || data.id;
          return {
            success: true,
            externalPostId: postId,
            externalPostUrl: `https://www.facebook.com/${postId}`,
            rawResponse: data,
          };
        } else {
          endpoint = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${accountId}/photos`;
          bodyParams.append('caption', text);
          bodyParams.append('url', mediaUrl);
        }
      } else {
        bodyParams.append('message', text);
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          errorCode: `FB_PUBLISH_FAILED_${res.status}`,
          errorMessage: errJson.error?.message || `Facebook publishing failed with status ${res.status}`,
          actionRequired:
            res.status === 403
              ? 'Check Facebook Page publishing role (Admin/Editor) and app permissions.'
              : undefined,
          rawResponse: errJson,
        };
      }

      const data = await res.json();
      const postId = data.post_id || data.id;
      const externalPostUrl = `https://www.facebook.com/${postId}`;

      return {
        success: true,
        externalPostId: postId,
        externalPostUrl,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'FB_PUBLISH_EXCEPTION',
        errorMessage: err.message || 'Unexpected exception during Facebook publishing.',
      };
    }
  }
}
