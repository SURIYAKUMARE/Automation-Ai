import { readMetaPermissions } from '../meta-permissions';
import { PlatformAdapter, OAuthUrlParams, OAuthTokenResult, PublishRequest, PublishResult } from '../types';

export class InstagramAdapter implements PlatformAdapter {
  platform = 'instagram' as const;

  private get appId(): string {
    return process.env.META_APP_ID || '1105730908969288';
  }

  private get appSecret(): string {
    return process.env.META_APP_SECRET || '';
  }

  getAuthorizationUrl({ redirectUri, state }: OAuthUrlParams): string {
    if (!this.appId) {
      throw new Error('META_APP_ID is not configured');
    }

    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
    ];

    if (process.env.META_ENABLE_INSIGHTS === "true") scopes.push("instagram_manage_insights", "read_insights");
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
      throw new Error(`Meta OAuth Token Exchange Failed: ${tokenRes.status} - ${err}`);
    }

    const tokenData = await tokenRes.json();
    const userAccessToken = tokenData.access_token;

    // Exchange for long-lived access token
    const longLivedParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: userAccessToken,
    });

    const longLivedRes = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/oauth/access_token?${longLivedParams.toString()}`);
    const longLivedData = longLivedRes.ok ? await longLivedRes.json() : tokenData;
    const finalAccessToken = longLivedData.access_token || userAccessToken;

    const grantedScopes = await readMetaPermissions(finalAccessToken, ["pages_show_list", "pages_read_engagement", "instagram_basic", "instagram_content_publish"]);
    // Discover connected Instagram Business / Creator account via Facebook Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/me/accounts?fields=id,name,tasks,instagram_business_account{id,username,profile_picture_url}&access_token=${finalAccessToken}`
    );

    if (!pagesRes.ok) {
      throw new Error('Could not retrieve Facebook Pages to discover linked Instagram Business Accounts.');
    }

    const pagesData = await pagesRes.json();
    let igAccount: any = null;

    if (pagesData.data && pagesData.data.length > 0) {
      for (const page of pagesData.data) {
        if (page.instagram_business_account && page.tasks?.some((task: string) => task === "CREATE_CONTENT" || task === "MANAGE")) {
          igAccount = page.instagram_business_account;
          break;
        }
      }
    }

    if (!igAccount) {
      throw new Error(
        'No eligible Instagram Professional (Business or Creator) account found linked to your Facebook Pages. Personal accounts do not support the official Content Publishing API.'
      );
    }

    return {
      accessToken: finalAccessToken,
      expiresInSeconds: longLivedData.expires_in || 5184000, // 60 days
      externalAccountId: igAccount.id,
      accountName: igAccount.username || 'Instagram Professional',
      accountHandle: `@${igAccount.username}`,
      avatarUrl: igAccount.profile_picture_url,
      grantedScopes,
      rawMetadata: igAccount,
    };
  }

  async validateToken(accessToken: string, accountId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${encodeURIComponent(accountId)}?fields=id`, {
        headers: { Authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(10_000),
      });
      return res.ok && (await res.json()).id === accountId;
    } catch {
      return false;
    }
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    const { text, mediaUrl, mediaType, accessToken, accountId } = request;

    if (!mediaUrl) {
      return {
        success: false,
        errorCode: 'INSTAGRAM_REQUIRES_MEDIA',
        errorMessage: 'Instagram publishing requires an image or video asset. Pure text posts are not supported by the Instagram Graph API.',
        actionRequired: 'Attach a JPEG image or a compatible Reel video to post to Instagram.',
      };
    }

    try {
      // Step 1: Create Media Container
      const containerParams = new URLSearchParams({
        caption: text,
        access_token: accessToken,
      });

      if (mediaType === 'video') {
        containerParams.append('media_type', 'REELS');
        containerParams.append('video_url', mediaUrl);
      } else {
        containerParams.append('image_url', mediaUrl);
        if (request.altText?.trim()) containerParams.append('alt_text', request.altText.trim());
      }

      const createRes = await fetch(
        `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${accountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: containerParams.toString(),
        }
      );

      if (!createRes.ok) {
        const errJson = await createRes.json().catch(() => ({}));
        return {
          success: false,
          errorCode: `IG_CONTAINER_FAILED_${createRes.status}`,
          errorMessage: errJson.error?.message || `Instagram container creation failed (${createRes.status})`,
          actionRequired:
            createRes.status === 400
              ? 'Check the media format and URL accessibility, and confirm the account has professional publishing rights.'
              : undefined,
          rawResponse: errJson,
        };
      }

      const createData = await createRes.json();
      const creationId = createData.id;
      if (typeof creationId !== 'string' || !creationId) {
        return { success: false, errorCode: 'IG_CONTAINER_NOT_READY', errorMessage: 'Instagram did not return a media container.' };
      }

      // Step 2: Poll container status if video or wait for ready
      let isReady = false;
      let attempts = 0;
      const maxAttempts = mediaType === 'video' ? 5 : 3;

      while (!isReady && attempts < maxAttempts) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, mediaType === 'video' ? 15_000 : 2000));

        const statusRes = await fetch(
          `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${creationId}?fields=status_code`,
          { headers: { Authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(8000) },
        ).catch(() => null);

        if (statusRes?.ok) {
          const statusData = await statusRes.json();
          if (statusData.status_code === 'FINISHED') {
            isReady = true;
          } else if (['ERROR', 'EXPIRED'].includes(statusData.status_code)) {
            return {
              success: false,
              errorCode: 'IG_CONTAINER_PROCESSING_ERROR',
              errorMessage: 'Instagram could not prepare this media container.',
            };
          }
        }
      }
      if (!isReady) return {
        success: false, errorCode: 'IG_CONTAINER_NOT_READY', errorMessage: 'Instagram is still preparing the media.',
      };

      // Step 3: Publish Media Container
      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: accessToken,
      });

      const publishRes = await fetch(
        `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${accountId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: publishParams.toString(),
        }
      );

      if (!publishRes.ok) {
        const publishErr = await publishRes.json().catch(() => ({}));
        return {
          success: false,
          errorCode: `IG_PUBLISH_FAILED_${publishRes.status}`,
          errorMessage: publishErr.error?.message || 'Instagram final publish execution failed.',
          rawResponse: publishErr,
        };
      }

      const publishData = await publishRes.json();
      const mediaId = publishData.id;

      // Step 4: Retrieve post permalink
      let permalink: string | undefined;
      if (mediaId) {
        const response = await fetch(
          `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${mediaId}?fields=permalink`,
          { headers: { Authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(8000) },
        ).catch(() => null);
        if (response?.ok) permalink = (await response.json().catch(() => ({}))).permalink;
      }

      return {
        success: true,
        externalPostId: mediaId,
        externalPostUrl: permalink,
        rawResponse: publishData,
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'IG_PUBLISH_EXCEPTION',
        errorMessage: err.message || 'Unexpected exception during Instagram publishing.',
      };
    }
  }
}
