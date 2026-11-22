import type { PlatformAdapter, OAuthUrlParams, OAuthTokenResult, PublishRequest, PublishResult } from '../types';

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
    if (process.env.LINKEDIN_ENABLE_MEMBER_ANALYTICS === 'true') scopes.push('r_member_postAnalytics');
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
    const grantedScopes = typeof tokenData.scope === 'string'
      ? tokenData.scope.split(/[ ,]+/).filter(Boolean) : ['openid', 'profile', 'email', 'w_member_social'];
    if (!grantedScopes.includes('w_member_social')) throw new Error('LinkedIn publishing permission was not granted');

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
      grantedScopes,
      rawMetadata: profileData,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken,
        client_id: this.clientId, client_secret: this.clientSecret }),
    });
    if (!response.ok) throw new Error('LinkedIn refresh unavailable');
    const token = await response.json();
    return { accessToken: token.access_token, expiresInSeconds: token.expires_in, refreshToken: token.refresh_token };
  }

  async validateToken(accessToken: string, accountId: string): Promise<boolean> {
    try {
      const res = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000),
      });
      return res.ok && (await res.json()).sub === accountId;
    } catch {
      return false;
    }
  }

  private async prepareVideo(bytes: Buffer, author: string, token: string): Promise<string | null | PublishResult> {
    const base = 'https://api.linkedin.com/rest/videos';
    const signal = AbortSignal.timeout(110_000);
    const headers = {
      Authorization: 'Bearer ' + token, 'Content-Type': 'application/json',
      'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202610', 'X-Restli-Protocol-Version': '2.0.0',
    };
    const failure = (code: string, message: string): PublishResult => ({ success: false, errorCode: code, errorMessage: message });
    try {
      const initialized = await fetch(base + '?action=initializeUpload', {
        method: 'POST', headers, signal,
        body: JSON.stringify({ initializeUploadRequest: { owner: author, fileSizeBytes: bytes.length, uploadCaptions: false, uploadThumbnail: false } }),
      });
      if ([403, 404, 410].includes(initialized.status)) return null;
      if (!initialized.ok) return failure('LINKEDIN_VIDEO_INIT_' + initialized.status, 'LinkedIn could not initialize video upload.');
      const data = (await initialized.json()).value;
      if (typeof data?.video !== 'string' || !data.video.startsWith('urn:li:video:') || !Array.isArray(data.uploadInstructions)) {
        return failure('LINKEDIN_VIDEO_UPLOAD_INVALID', 'LinkedIn did not return a valid video upload session.');
      }

      const receipts: string[] = [];
      let offset = 0;
      for (const part of data.uploadInstructions) {
        const target = URL.parse(part.uploadUrl);
        const end = Math.min(part.lastByte + 1, bytes.length);
        if (!target || target.protocol !== 'https:' || !/(^|\.)linkedin\.com$/i.test(target.hostname) ||
            !Number.isSafeInteger(end) || part.firstByte !== offset || end <= offset) {
          return failure('LINKEDIN_VIDEO_UPLOAD_INVALID', 'LinkedIn returned invalid video part instructions.');
        }
        const upload = await fetch(target, {
          method: 'PUT', redirect: 'error', signal, headers: { 'Content-Type': 'application/octet-stream' },
          body: new Uint8Array(bytes.subarray(offset, end)),
        });
        const etag = upload.headers.get('etag')?.replace(/^"|"$/g, '');
        if (!upload.ok || !etag) return failure('LINKEDIN_VIDEO_PART_' + upload.status, 'LinkedIn could not accept a video part.');
        receipts.push(etag);
        offset = end;
      }
      if (offset !== bytes.length) return failure('LINKEDIN_VIDEO_UPLOAD_INVALID', 'LinkedIn did not receive the complete video.');
      const finalized = await fetch(base + '?action=finalizeUpload', {
        method: 'POST', headers, signal,
        body: JSON.stringify({ finalizeUploadRequest: { video: data.video, uploadToken: data.uploadToken || '', uploadedPartIds: receipts } }),
      });
      if (!finalized.ok) return failure('LINKEDIN_VIDEO_FINALIZE_' + finalized.status, 'LinkedIn could not finalize video upload.');

      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 8000));
        const response = await fetch(base + '/' + encodeURIComponent(data.video), { headers, signal });
        if (!response.ok) return failure('LINKEDIN_VIDEO_STATUS_' + response.status, 'Could not check LinkedIn video processing.');
        const { status } = await response.json();
        if (status === 'AVAILABLE') return data.video;
        if (status === 'PROCESSING_FAILED') return failure('LINKEDIN_VIDEO_PROCESSING_FAILED', 'LinkedIn rejected this video during encoding.');
      }
      return failure('LINKEDIN_VIDEO_NOT_READY', 'LinkedIn is still processing the video.');
    } catch {
      return failure('LINKEDIN_VIDEO_NOT_READY', 'LinkedIn video preparation did not finish.');
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
      const authorUrn = accountId.startsWith('urn:li:') ? accountId : `urn:li:person:${accountId}`;
      const isVideo = mediaType === 'video';

      // 1. Resolve media binary buffer if mediaUrl is provided (supports base64 data URLs & HTTP URLs)
      let mediaBuffer: Buffer | null = null;
      let mimeType = isVideo ? 'video/mp4' : 'image/jpeg';

      if (mediaUrl) {
        try {
          if (mediaUrl.startsWith('data:')) {
            const commaIdx = mediaUrl.indexOf(',');
            const header = mediaUrl.substring(0, commaIdx);
            const b64 = mediaUrl.substring(commaIdx + 1);
            const mimeMatch = header.match(/data:([^;]+)/);
            if (mimeMatch) mimeType = mimeMatch[1];
            mediaBuffer = Buffer.from(b64, 'base64');
          } else {
            const fileRes = await fetch(mediaUrl, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
            if (fileRes.ok) {
              const cType = fileRes.headers.get('content-type');
              if (cType) mimeType = cType.split(';')[0].trim();
              const arrayBuf = await fileRes.arrayBuffer();
              mediaBuffer = Buffer.from(arrayBuf);
            } else {
              console.warn('Could not fetch LinkedIn media asset:', fileRes.status);
            }
          }
        } catch (bufErr) {
          console.warn('Error reading media asset for LinkedIn publishing:', bufErr);
        }
      }

      if (mediaUrl && !mediaBuffer) {
        return { success: false, errorCode: 'MEDIA_DOWNLOAD_FAILED', errorMessage: 'Could not read the stored LinkedIn media.' };
      }

      let uploadedRestMediaUrn: string | null = null;
      let uploadedAssetUrn: string | null = null;
      const apiVersion = process.env.LINKEDIN_API_VERSION || '202401';
      const versionCandidates = [apiVersion, '202401', '202410', '202501', '202610'].filter(
        (v, idx, arr) => arr.indexOf(v) === idx
      );

      if (mediaBuffer && isVideo) {
        const modernVideo = await this.prepareVideo(mediaBuffer, authorUrn, accessToken);
        if (typeof modernVideo === 'string') uploadedRestMediaUrn = modernVideo;
        else if (modernVideo) return modernVideo;
      }

      // 2. Try Modern LinkedIn REST Images API (/rest/images)
      if (mediaBuffer && !isVideo) {
        for (const v of versionCandidates) {
          try {
            const initRes = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'LinkedIn-Version': v,
                'X-Restli-Protocol-Version': '2.0.0',
              },
              body: JSON.stringify({
                initializeUploadRequest: {
                  owner: authorUrn,
                },
              }),
            });

            if (initRes.ok) {
              const initData = await initRes.json();
              const uploadUrl = initData.value?.uploadUrl;
              const imageUrn = initData.value?.image;

              if (uploadUrl && imageUrn) {
                // Try PUT with Authorization header first
                let putRes = await fetch(uploadUrl, {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': mimeType || 'application/octet-stream',
                  },
                  body: new Uint8Array(mediaBuffer),
                });

                // If rejected (e.g. S3 pre-signed URL rejects Auth header), retry without
                if (!putRes.ok && putRes.status !== 201) {
                  putRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': mimeType || 'application/octet-stream',
                    },
                    body: new Uint8Array(mediaBuffer),
                  });
                }

                if (putRes.ok || putRes.status === 201) {
                  uploadedRestMediaUrn = imageUrn;
                  break;
                }
              }
            }
          } catch (restImgErr) {
            console.warn(`LinkedIn /rest/images initialize failed with version ${v}:`, restImgErr);
          }
        }
      }

      // 3. Try Legacy UGC Assets API (/v2/assets) as backup or primary for video/image
      if (mediaBuffer && !uploadedRestMediaUrn) {
        try {
          const recipe = isVideo
            ? 'urn:li:digitalmediaRecipe:feedshare-video'
            : 'urn:li:digitalmediaRecipe:feedshare-image';

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
            const uploadMechanism =
              regData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'];
            const uploadUrl = uploadMechanism?.uploadUrl;
            const regHeaders = uploadMechanism?.headers || {};
            const assetUrn = regData.value?.asset;

            if (uploadUrl && assetUrn) {
              // Try upload with provider headers first
              let putRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                  'Content-Type': mimeType || 'application/octet-stream',
                  ...regHeaders,
                },
                body: new Uint8Array(mediaBuffer),
              });

              // If that fails, try with Authorization header
              if (!putRes.ok && putRes.status !== 201) {
                putRes = await fetch(uploadUrl, {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': mimeType || 'application/octet-stream',
                    ...regHeaders,
                  },
                  body: new Uint8Array(mediaBuffer),
                });
              }

              if (putRes.ok || putRes.status === 201) {
                uploadedAssetUrn = assetUrn;
              }
            }
          }
        } catch (ugcAssetErr) {
          console.warn('LinkedIn /v2/assets registerUpload error:', ugcAssetErr);
        }
      }

      if (mediaUrl && !uploadedRestMediaUrn && !uploadedAssetUrn) {
        return { success: false, errorCode: 'LINKEDIN_MEDIA_UPLOAD_FAILED',
          actionRequired: 'LinkedIn could not accept the media. Check the media format and app permissions.' };
      }

      // Publish once the image or video has an official media URN.
      if (uploadedRestMediaUrn) {
        for (const v of versionCandidates) {
          try {
            const restPostRes = await fetch('https://api.linkedin.com/rest/posts', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'LinkedIn-Version': v,
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
                content: {
                  media: {
                    title: request.title || 'SocialSync AI Post',
                    id: uploadedRestMediaUrn,
                  },
                },
                lifecycleState: 'PUBLISHED',
                isReshareDisabledByAuthor: false,
              }),
            });

            if (restPostRes.ok) {
              const restUrn =
                restPostRes.headers.get('x-restli-id') ||
                restPostRes.headers.get('x-linkedin-id') || undefined;
              return {
                success: true,
                externalPostId: restUrn,
                externalPostUrl: restUrn ? `https://www.linkedin.com/feed/update/${restUrn}/` : undefined,
              };
            }
          } catch (restPostErr) {
            console.warn(`LinkedIn /rest/posts with version ${v} failed:`, restPostErr);
          }
        }
        return { success: false, errorCode: 'LINKEDIN_API_ERROR',
          actionRequired: 'Check that your LinkedIn app has permission to create posts.' };
      }

      // 5. Publish via Community Management / UGC Post REST API (/v2/ugcPosts)
      const specificContent: any = {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: text,
          },
          shareMediaCategory: uploadedAssetUrn ? (isVideo ? 'VIDEO' : 'IMAGE') : 'NONE',
          media: uploadedAssetUrn
            ? [
                {
                  status: 'READY',
                  description: { text: text.substring(0, 100) },
                  media: uploadedAssetUrn,
                  title: { text: request.title || (isVideo ? 'SocialSync AI Video' : 'SocialSync AI Photo') },
                },
              ]
            : undefined,
        },
      };

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
        // Text posts can use the versioned endpoint if the legacy endpoint is unavailable.
        if (!mediaUrl && [403, 404, 410, 426].includes(res.status)) try {
          const restRes = await fetch('https://api.linkedin.com/rest/posts', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'LinkedIn-Version': apiVersion,
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
              content: uploadedRestMediaUrn
                ? {
                    media: {
                      title: request.title || 'SocialSync AI Post',
                      id: uploadedRestMediaUrn,
                    },
                  }
                : undefined,
              lifecycleState: 'PUBLISHED',
              isReshareDisabledByAuthor: false,
            }),
          });

          if (restRes.ok) {
            const restUrn =
              restRes.headers.get('x-restli-id') ||
              restRes.headers.get('x-linkedin-id') || undefined;
            return {
              success: true,
              externalPostId: restUrn,
              externalPostUrl: restUrn ? `https://www.linkedin.com/feed/update/${restUrn}/` : undefined,
            };
          }
          return { success: false, errorCode: `LINKEDIN_API_${restRes.status}`,
            actionRequired: 'Check that your LinkedIn app has permission to create posts.' };
        } catch {
          return { success: false, errorCode: 'LINKEDIN_NETWORK_ERROR', errorMessage: 'LinkedIn submission could not be confirmed.' };
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

      const resData = await res.json().catch(() => ({}));
      const urn = res.headers.get('x-restli-id') || resData.id;
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
