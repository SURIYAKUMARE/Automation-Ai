import { PlatformAdapter, OAuthUrlParams, OAuthTokenResult, PublishRequest, PublishResult } from '../types';

export class YouTubeAdapter implements PlatformAdapter {
  platform = 'youtube' as const;

  private get clientId(): string {
    return process.env.GOOGLE_CLIENT_ID || '';
  }

  private get clientSecret(): string {
    return process.env.GOOGLE_CLIENT_SECRET || '';
  }

  getAuthorizationUrl({ redirectUri, state }: OAuthUrlParams): string {
    if (!this.clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokenResult> {
    const params = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Google OAuth Token Exchange Failed: ${tokenRes.status} - ${err}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Retrieve YouTube channel details
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    let channelId = 'unknown';
    let channelTitle = 'YouTube Creator';
    let avatarUrl: string | undefined;

    if (channelRes.ok) {
      const channelData = await channelRes.json();
      if (channelData.items && channelData.items.length > 0) {
        const item = channelData.items[0];
        channelId = item.id;
        channelTitle = item.snippet?.title || 'YouTube Channel';
        avatarUrl = item.snippet?.thumbnails?.default?.url;
      }
    }

    if (channelId === 'unknown') throw new Error('A YouTube channel is required to connect this account');
    if (!(tokenData.scope || '').split(' ').includes('https://www.googleapis.com/auth/youtube.upload')) {
      throw new Error('YouTube upload permission was not granted');
    }
    return {
      accessToken,
      refreshToken,
      expiresInSeconds: tokenData.expires_in,
      externalAccountId: channelId,
      accountName: channelTitle,
      accountHandle: `@${channelTitle.replace(/\s+/g, '').toLowerCase()}`,
      avatarUrl,
      grantedScopes: tokenData.scope ? tokenData.scope.split(' ') : [],
      rawMetadata: { channelId, channelTitle },
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresInSeconds?: number }> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`YouTube Token Refresh Failed: ${res.status}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresInSeconds: data.expires_in,
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    const { text, title, mediaUrl, mediaType, tags = [], accessToken } = request;

    if (!accessToken) {
      return {
        success: false,
        errorCode: 'MISSING_ACCESS_TOKEN',
        errorMessage: 'No access token available for YouTube publishing. Please connect your YouTube account in the Authentication tab.',
        actionRequired: 'Connect or reauthorize your YouTube account in Authentication tab.',
      };
    }

    if (mediaType !== 'video' || !mediaUrl) {
      return {
        success: false,
        errorCode: 'YOUTUBE_REQUIRES_VIDEO',
        errorMessage: 'YouTube publishing requires a valid video asset. Static images cannot be uploaded to YouTube directly.',
        actionRequired: 'Please attach a video file (MP4, MOV, WEBM) to publish to YouTube.',
      };
    }

    try {
      // 1. Fetch video metadata
      const videoTitle = (title || text.split('\n')[0] || 'SocialSync AI Video').substring(0, 100);
      const videoDescription = `${text}\n\nPublished automatically via SocialSync AI.`;

      // 2. Initialize Resumable Upload Session
      const initRes = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': 'video/mp4',
          },
          body: JSON.stringify({
            snippet: {
              title: videoTitle,
              description: videoDescription,
              tags: tags.length > 0 ? tags : ['SocialSyncAI', 'Automation'],
              categoryId: '28', // Science & Technology
            },
            status: {
              privacyStatus: 'public',
              selfDeclaredMadeForKids: false,
            },
          }),
        }
      );

      const actualInitRes = initRes;
      if (!actualInitRes.ok) {
        const errJson = await actualInitRes.json().catch(() => ({}));
        return {
          success: false,
          errorCode: `YOUTUBE_INIT_FAILED_${actualInitRes.status}`,
          errorMessage: errJson.error?.message || `YouTube upload initialization failed (${actualInitRes.status})`,
          actionRequired: actualInitRes.status === 403 ? 'YouTube API Quota exceeded or verification needed in Google Cloud Console.' : undefined,
          rawResponse: errJson,
        };
      }

      const uploadUrl = actualInitRes.headers.get('Location');
      if (!uploadUrl) {
        return {
          success: false,
          errorCode: 'NO_UPLOAD_URL',
          errorMessage: 'YouTube resumable upload URL header not provided.',
        };
      }

      // 3. Stream video file buffer to uploadUrl
      const videoFileRes = await fetch(mediaUrl, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
      if (!videoFileRes.ok) {
        return {
          success: false,
          errorCode: 'MEDIA_DOWNLOAD_FAILED',
          errorMessage: 'Could not fetch video file from storage to upload to YouTube.',
        };
      }

      const videoBuffer = await videoFileRes.arrayBuffer();
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoBuffer.byteLength.toString(),
        },
        body: videoBuffer,
      });

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json().catch(() => ({}));
        return {
          success: false,
          errorCode: `YOUTUBE_UPLOAD_FAILED_${uploadRes.status}`,
          errorMessage: uploadErr.error?.message || 'Failed uploading video stream to YouTube',
          rawResponse: uploadErr,
        };
      }

      const uploadData = await uploadRes.json();
      const videoId = uploadData.id;
      const externalPostUrl = `https://www.youtube.com/watch?v=${videoId}`;

      return {
        success: true,
        externalPostId: videoId,
        externalPostUrl,
        rawResponse: uploadData,
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'YOUTUBE_PUBLISH_EXCEPTION',
        errorMessage: err.message || 'Unexpected exception during YouTube publishing.',
      };
    }
  }
}
