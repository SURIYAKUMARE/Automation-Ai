import { PlatformAdapter, OAuthUrlParams, OAuthTokenResult, PublishRequest, PublishResult } from '../types';

export class LinkedInAdapter implements PlatformAdapter {
  platform = 'linkedin' as const;

  private get clientId(): string {
    return process.env.LINKEDIN_CLIENT_ID || '';
  }

  private get clientSecret(): string {
    return process.env.LINKEDIN_CLIENT_SECRET || '';
  }

  getAuthorizationUrl({ redirectUri, state }: OAuthUrlParams): string {
    if (!this.clientId) {
      throw new Error('LINKEDIN_CLIENT_ID is not configured in environment variables');
    }

    const scopes = ['openid', 'profile', 'email', 'w_member_social'];
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state: state,
      scope: scopes.join(' '),
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokenResult> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      throw new Error(`LinkedIn OAuth Token Exchange Failed: ${tokenRes.status} - ${errBody}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;

    // Fetch user profile info via OpenID userinfo endpoint
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      const profileErr = await profileRes.text();
      throw new Error(`Failed to retrieve LinkedIn user profile: ${profileRes.status} - ${profileErr}`);
    }

    const profileData = await profileRes.json();
    const externalAccountId = profileData.sub;
    const accountName = profileData.name || `${profileData.given_name || ''} ${profileData.family_name || ''}`.trim() || 'LinkedIn Member';
    const avatarUrl = profileData.picture || null;

    return {
      accessToken,
      refreshToken: tokenData.refresh_token,
      expiresInSeconds: expiresIn,
      externalAccountId,
      accountName,
      accountHandle: profileData.email || profileData.sub,
      avatarUrl,
      grantedScopes: ['openid', 'profile', 'email', 'w_member_social'],
      rawMetadata: profileData,
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const res = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    const { text, accessToken, accountId, mediaUrl, mediaType } = request;

    if (!accessToken) {
      return {
        success: false,
        errorCode: 'MISSING_ACCESS_TOKEN',
        errorMessage: 'No access token available for LinkedIn publishing.',
        actionRequired: 'Connect or reauthorize your LinkedIn account in Social Accounts.',
      };
    }

    try {
      // Use LinkedIn Community Management / UGC Post REST API
      const authorUrn = `urn:li:person:${accountId}`;
      let specificContent: any = {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: text,
          },
          shareMediaCategory: 'NONE',
        },
      };

      // If media is attached, register and upload image or video
      if (mediaUrl) {
        const isVideo = mediaType === 'video';
        const recipe = isVideo
          ? 'urn:li:digitalmediaRecipe:feedshare-video'
          : 'urn:li:digitalmediaRecipe:feedshare-image';

        try {
          const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify({
              registerUploadRequest: {
                recipes: [recipe],
                owner: authorUrn,
                serviceRelationships: [
                  {
                    relationshipType: 'OWNER',
                    identifier: 'urn:li:userGeneratedContent',
                  },
                ],
              },
            }),
          });

          if (registerRes.ok) {
            const regData = await registerRes.json();
            const uploadUrl = regData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
            const assetUrn = regData.value?.asset;

            if (uploadUrl && assetUrn) {
              const fileRes = await fetch(mediaUrl);
              if (fileRes.ok) {
                const arrayBuf = await fileRes.arrayBuffer();
                const mimeType = isVideo ? 'application/octet-stream' : 'image/jpeg';

                // Single-part upload to LinkedIn asset storage (supports PUT & fallback POST)
                let uploadSuccess = false;
                try {
                  const putRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      'Content-Type': mimeType,
                    },
                    body: arrayBuf,
                  });
                  uploadSuccess = putRes.ok;
                } catch {}

                if (!uploadSuccess) {
                  try {
                    const postRes = await fetch(uploadUrl, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': mimeType,
                      },
                      body: arrayBuf,
                    });
                    uploadSuccess = postRes.ok;
                  } catch {}
                }

                if (uploadSuccess) {
                  specificContent = {
                    'com.linkedin.ugc.ShareContent': {
                      shareCommentary: { text },
                      shareMediaCategory: isVideo ? 'VIDEO' : 'IMAGE',
                      media: [
                        {
                          status: 'READY',
                          description: { text: text.substring(0, 100) },
                          media: assetUrn,
                          title: { text: request.title || (isVideo ? 'SocialSync AI Video' : 'SocialSync AI Photo') },
                        },
                      ],
                    },
                  };
                }
              }
            }
          }
        } catch (mediaErr) {
          console.warn('LinkedIn media upload failed, continuing with text:', mediaErr);
        }
      }

      const postBody = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: specificContent,
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postBody),
      });

      if (!res.ok) {
        // Fallback: Try LinkedIn modern /rest/posts API
        try {
          const restRes = await fetch('https://api.linkedin.com/rest/posts', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'LinkedIn-Version': '202401',
              'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify({
              author: authorUrn,
              commentary: text,
              visibility: 'PUBLIC',
              distribution: {
                feedDistribution: 'MAIN_FEED',
                targetEntities: [],
                thirdPartyDistributionChannels: [],
              },
              lifecycleState: 'PUBLISHED',
              isReshareDisabledByAuthor: false,
            }),
          });

          if (restRes.ok) {
            const restUrn =
              restRes.headers.get('x-restli-id') ||
              restRes.headers.get('x-linkedin-id') ||
              `urn:li:share:${Date.now()}`;
            return {
              success: true,
              externalPostId: restUrn,
              externalPostUrl: `https://www.linkedin.com/feed/update/${restUrn}/`,
            };
          }
        } catch {
          // Fall through to error handling
        }

        const errorJson = await res.json().catch(() => ({ message: res.statusText }));
        return {
          success: false,
          errorCode: `LINKEDIN_API_${res.status}`,
          errorMessage: errorJson.message || `LinkedIn post creation failed with HTTP status ${res.status}`,
          actionRequired:
            res.status === 401
              ? 'LinkedIn token expired. Please re-authenticate your LinkedIn account.'
              : 'Verify LinkedIn app permissions (w_member_social).',
          rawResponse: errorJson,
        };
      }

      const resData = await res.json();
      const urn = resData.id;
      // Convert urn:li:share:12345 or urn:li:ugcPost:12345 to public URL
      const externalPostUrl = urn ? `https://www.linkedin.com/feed/update/${urn}/` : undefined;

      return {
        success: true,
        externalPostId: urn,
        externalPostUrl,
        rawResponse: resData,
      };
    } catch (error: any) {
      return {
        success: false,
        errorCode: 'LINKEDIN_NETWORK_ERROR',
        errorMessage: error.message || 'Network exception during LinkedIn publishing.',
      };
    }
  }
}
