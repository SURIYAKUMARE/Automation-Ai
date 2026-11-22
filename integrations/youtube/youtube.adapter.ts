import { PlatformAdapter, OAuthUrlParams, OAuthTokenResult, PublishRequest, PublishResult } from '../types';
import { getYouTubeOAuthConfig } from '@/lib/auth/google-config';

const youtubeScopes = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];

export class YouTubeAdapter implements PlatformAdapter {
  platform = 'youtube' as const;

  private get clientId(): string {
    return getYouTubeOAuthConfig()?.clientId || '';
  }

  private get clientSecret(): string {
    return getYouTubeOAuthConfig()?.clientSecret || '';
  }

  getAuthorizationUrl({ redirectUri, state }: OAuthUrlParams): string {
    if (!this.clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: youtubeScopes.join(' '),
      access_type: 'offline',
      prompt: 'select_account consent',
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
    const grantedScopes = (tokenData.scope || '').split(/\s+/);
    if (!youtubeScopes.every((scope) => grantedScopes.includes(scope))) throw new Error('Required YouTube permissions were not granted');
    return {
      accessToken,
      refreshToken,
      expiresInSeconds: tokenData.expires_in,
      externalAccountId: channelId,
      accountName: channelTitle,
      accountHandle: `@${channelTitle.replace(/\s+/g, '').toLowerCase()}`,
      avatarUrl,
      grantedScopes,
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

  async validateToken(accessToken: string, accountId: string): Promise<boolean> {
    try {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000),
        }
      );
      if (!res.ok) return false;
      const data = await res.json();
      return Array.isArray(data.items) && data.items.some((channel: { id: string }) => channel.id === accountId);
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
              privacyStatus: request.youtubePrivacy || 'public',
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

      const location = actualInitRes.headers.get('Location');
      const uploadUrl = location ? URL.parse(location) : null;
      if (!uploadUrl || uploadUrl.protocol !== 'https:' || !/\.googleapis\.com$/i.test(uploadUrl.hostname)) {
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
        redirect: 'error',
        signal: AbortSignal.timeout(110_000),
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
      const externalPostUrl = videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : undefined;
      const status = uploadData.status?.uploadStatus;
      if (['failed', 'rejected', 'deleted'].includes(status)) {
        return { success: false, externalPostId: videoId, externalPostUrl,
          errorMessage: 'YouTube rejected or removed this upload. Review the video in YouTube Studio.' };
      }

      return {
        success: true,
        processing: status !== 'processed',
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
