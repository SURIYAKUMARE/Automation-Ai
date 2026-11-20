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

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      state: state,
      response_type: 'code',
      scope: scopes.join(','),
    });

    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokenResult> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code: code,
    });

    const tokenRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`);
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

    const longLivedRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${longLivedParams.toString()}`);
    const longLivedData = longLivedRes.ok ? await longLivedRes.json() : tokenData;
    const finalUserToken = longLivedData.access_token || userAccessToken;

    // Discover Facebook Pages managed by user
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category,picture&access_token=${finalUserToken}`
    );

    if (!pagesRes.ok) {
      throw new Error('Failed to retrieve user managed Facebook Pages.');
    }

    const pagesData = await pagesRes.json();
    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No managed Facebook Pages found for this account. Automated publishing requires a managed Facebook Page.');
    }

    // Select primary page (or first available)
    const primaryPage = pagesData.data[0];
    const pageAccessToken = primaryPage.access_token;
    const pageId = primaryPage.id;
    const pageName = primaryPage.name;
    const avatarUrl = primaryPage.picture?.data?.url;

    return {
      accessToken: pageAccessToken, // Use Page Access Token so publishing is perpetual and authorized for the Page
      refreshToken: finalUserToken, // Save user token in refresh slot
      expiresInSeconds: 0, // Page tokens obtained from 60-day user tokens do not expire
      externalAccountId: pageId,
      accountName: `${pageName} (Page)`,
      accountHandle: `@${pageName.replace(/\s+/g, '').toLowerCase()}`,
      avatarUrl,
      grantedScopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
      rawMetadata: { pageId, pageName, allPages: pagesData.data },
    };
  }

  async validateToken(accessToken: string, accountId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${accountId}?fields=id,name&access_token=${accessToken}`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    const { text, mediaUrl, mediaType, accessToken, accountId } = request;

    try {
      let endpoint = `https://graph.facebook.com/v21.0/${accountId}/feed`;
      const bodyParams = new URLSearchParams({
        access_token: accessToken,
      });

      if (mediaUrl) {
        if (mediaType === 'video') {
          endpoint = `https://graph.facebook.com/v21.0/${accountId}/videos`;
          bodyParams.append('description', text);
          bodyParams.append('file_url', mediaUrl);
        } else {
          endpoint = `https://graph.facebook.com/v21.0/${accountId}/photos`;
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
      const postId = data.id || data.post_id;
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
