import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken, encryptToken } from '@/lib/security/encryption';
import { getPlatformAdapter } from '@/integrations';
import { PublishResult } from '@/integrations/types';
import { signMedia } from '@/lib/publishing/media';
import { SocialPlatform } from '@/types';

type Database = ReturnType<typeof createAdminClient>;
export interface ClaimedJob {
  id: string;
  post_id: string;
  user_id: string;
  retry_count: number;
  max_retries: number;
  target_id?: string | null;
}

type Account = {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  status: string;
  external_account_id: string;
  encrypted_access_token: string;
  encrypted_refresh_token?: string;
  token_expires_at?: string;
  metadata?: Record<string, unknown>;
};

export async function getAccountAccessToken(db: Database, account: Account) {
  const isExpiringSoon = account.token_expires_at && Date.parse(account.token_expires_at) <= Date.now() + 60_000;
  if (!isExpiringSoon && account.encrypted_access_token) {
    return decryptToken(account.encrypted_access_token);
  }
  const adapter = getPlatformAdapter(account.platform);
  if (!adapter.refreshAccessToken || !account.encrypted_refresh_token) {
    return decryptToken(account.encrypted_access_token);
  }
  try {
    const refreshed = await adapter.refreshAccessToken(decryptToken(account.encrypted_refresh_token), account.metadata);
    if (!refreshed.accessToken) return decryptToken(account.encrypted_access_token);
    await db.from('social_accounts').update({
      encrypted_access_token: encryptToken(refreshed.accessToken),
      ...(refreshed.refreshToken ? { encrypted_refresh_token: encryptToken(refreshed.refreshToken) } : {}),
      token_expires_at: refreshed.expiresInSeconds ? new Date(Date.now() + refreshed.expiresInSeconds * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', account.id);
    return refreshed.accessToken;
  } catch (err) {
    console.warn(`Proactive token refresh failed for ${account.platform}:`, err);
    return decryptToken(account.encrypted_access_token);
  }
}

const eligible = ['draft', 'ready', 'approved', 'scheduled', 'pending_approval', 'failed', 'reauthorization_required', 'publishing'];

export async function dispatchCampaign(db: Database, ownerId: string, campaignId: string) {
  try {
    let job: ClaimedJob | undefined;
    const { data, error } = await db.rpc('claim_campaign_publishing_job', {
      owner_id: ownerId, campaign_id: campaignId,
    });
    if (!error && data?.[0]) {
      job = data[0] as ClaimedJob;
    } else {
      if (error) {
        console.warn('claim_campaign_publishing_job notification:', error.message);
      }
      // Check for an existing queued or running job for this post
      const { data: existingJob } = await db.from('publishing_jobs')
        .select('*')
        .eq('user_id', ownerId)
        .eq('post_id', campaignId)
        .in('status', ['queued', 'running'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingJob?.status === 'running') {
        console.log(`Job ${existingJob.id} is already actively running for post ${campaignId}`);
        return;
      } else if (existingJob?.status === 'queued') {
        await db.from('posts').update({ status: 'publishing', updated_at: new Date().toISOString() })
          .eq('id', campaignId).eq('user_id', ownerId);
        const { data: claimed } = await db.from('publishing_jobs')
          .update({ status: 'running', updated_at: new Date().toISOString() })
          .eq('id', existingJob.id)
          .eq('status', 'queued')
          .select()
          .maybeSingle();
        if (claimed) job = claimed as ClaimedJob;
      }
    }

    // Direct fallback: ensure a real database-backed job exists with valid UUID
    if (!job) {
      const { data: fallbackJob, error: insertErr } = await db.from('publishing_jobs').insert({
        post_id: campaignId,
        user_id: ownerId,
        status: 'running',
        run_at: new Date().toISOString(),
        idempotency_key: `campaign:${campaignId}:${Date.now()}`,
      }).select().maybeSingle();

      if (!insertErr && fallbackJob) {
        await db.from('posts').update({ status: 'publishing', updated_at: new Date().toISOString() })
          .eq('id', campaignId).eq('user_id', ownerId);
        job = fallbackJob as ClaimedJob;
      }
    }

    if (job) {
      await executePostPublishing(db, job);
    }
  } catch (error) {
    // The worker handles queued jobs and reconciles interrupted dispatches.
    console.warn('Immediate publishing execution encountered an error:', error);
  }
}

export async function executePostPublishing(db: Database, job: ClaimedJob) {
  const { data: post, error } = await db.from('posts')
    .select('*, media:media_assets(*), variants:post_variants(*), targets:post_targets(*, account:social_accounts(*))')
    .eq('id', job.post_id).eq('user_id', job.user_id).single();
  if (error || !post) throw new Error('Could not load the queued post');

  let media = Array.isArray(post.media) ? post.media[0] : post.media;
  if (!media && post.media_asset_id) {
    const { data: assetData } = await db.from('media_assets')
      .select('*')
      .eq('id', post.media_asset_id)
      .eq('user_id', job.user_id)
      .maybeSingle();
    if (assetData) media = assetData;
  }

  let mediaUrl: string | undefined;
  if (media?.file_path) {
    try {
      mediaUrl = await signMedia(media.file_path, job.user_id, 86400);
    } catch {
      try {
        const { data: directSign } = await db.storage.from('media-assets').createSignedUrl(media.file_path, 86400);
        if (directSign?.signedUrl) mediaUrl = directSign.signedUrl;
      } catch (storageErr) {
        console.warn('Direct media signing fallback failed:', storageErr);
      }
    }
  }

  const targetStatuses = job.retry_count > 0 ? ['scheduled'] : eligible;
  const results = await Promise.all(post.targets.filter((target: { id: string; status: string; external_post_id?: string }) =>
    !target.external_post_id && targetStatuses.includes(target.status) && (!job.target_id || target.id === job.target_id))
    .map(async (target: { id: string; platform: SocialPlatform; account: Account | null }) => {
      try {
        const claimed = await db.from('post_targets').update({ status: 'publishing', updated_at: new Date().toISOString() })
          .eq('id', target.id).eq('post_id', post.id).in('status', eligible).select('id').maybeSingle();
        if (claimed.error) throw claimed.error;
        if (!claimed.data) return false;

        const platform = target.platform;
        const account = target.account;
        const variant = post.variants.filter((item: { platform: string }) => item.platform === platform)
          .sort((a: { version: number }, b: { version: number }) => b.version - a.version)[0];
        let result: PublishResult = { success: false, errorMessage: 'An approved platform caption is required.' };
        let ambiguous = false;
        let stagingFailure = false;
        if (variant && variant.caption && (post.publishing_mode === 'automatic' || variant.is_approved)) {
          if (!account || account.user_id !== job.user_id || account.status !== 'active' || account.platform !== platform) {
            result = { success: false, errorCode: 'RECONNECT', errorMessage: 'Reconnect the destination account before retrying.' };
          } else if (post.media_asset_id && !mediaUrl || platform === 'youtube' && media?.media_type !== 'video' && !media?.mime_type?.startsWith('video/') ||
                     platform === 'instagram' && !mediaUrl) {
            result = { success: false, errorMessage: 'The required uploaded media is missing or unavailable.' };
          } else {
            const token = await getAccountAccessToken(db, account).catch(() => null);
            if (!token) {
              result = { success: false, errorCode: 'RECONNECT', errorMessage: 'The connection expired. Reconnect the account and retry.' };
            } else {
              const tags = (variant.hashtags as string[] | null) ?? [];
              const existingTags = new Set((variant.caption.match(/#[\p{L}\p{M}\p{N}_]+/gu) || []).map((t: string) => t.toLowerCase()));
              const newTags = tags.map((tag) => (tag.startsWith('#') ? tag : '#' + tag))
                .filter((tag) => !existingTags.has(tag.toLowerCase()));
              const text = [variant.caption, newTags.join(' ')].filter(Boolean).join('\n\n');
              try {
                result = await getPlatformAdapter(platform).publish({
                  text, title: variant.title || post.title,
                  youtubePrivacy: variant.youtube_privacy ?? undefined,
                  altText: variant.alt_text ?? undefined,
                  tags: platform === 'youtube' && variant.keywords?.length ? variant.keywords : tags, mediaUrl,
                  mediaType: media?.media_type === 'video' ? 'video' : mediaUrl ? 'image' : undefined,
                  accessToken: token, accountId: account.external_account_id, metadata: account.metadata,
                });
                // If unauthorized (401) and account has a refresh token, refresh immediately and retry once
                if ((result.errorCode === 'RECONNECT' || result.errorCode?.endsWith('_401') || result.errorCode?.includes('401')) && account.encrypted_refresh_token) {
                  const adapter = getPlatformAdapter(platform);
                  if (adapter.refreshAccessToken) {
                    try {
                      const refreshed = await adapter.refreshAccessToken(decryptToken(account.encrypted_refresh_token), account.metadata);
                      if (refreshed.accessToken) {
                        await db.from('social_accounts').update({
                          encrypted_access_token: encryptToken(refreshed.accessToken),
                          ...(refreshed.refreshToken ? { encrypted_refresh_token: encryptToken(refreshed.refreshToken) } : {}),
                          token_expires_at: refreshed.expiresInSeconds ? new Date(Date.now() + refreshed.expiresInSeconds * 1000).toISOString() : null,
                          updated_at: new Date().toISOString(),
                        }).eq('id', account.id);

                        // Retry publish with refreshed token
                        result = await adapter.publish({
                          text, title: variant.title || post.title,
                          youtubePrivacy: variant.youtube_privacy ?? undefined,
                          altText: variant.alt_text ?? undefined,
                          tags: platform === 'youtube' && variant.keywords?.length ? variant.keywords : tags, mediaUrl,
                          mediaType: media?.media_type === 'video' ? 'video' : mediaUrl ? 'image' : undefined,
                          accessToken: refreshed.accessToken, accountId: account.external_account_id, metadata: account.metadata,
                        });
                      }
                    } catch (refreshRetryErr) {
                      console.warn(`Token refresh retry failed for ${platform}:`, refreshRetryErr);
                    }
                  }
                }

                stagingFailure = Boolean(result.errorCode?.match(/^(?:IG_CONTAINER_FAILED_5\d\d|IG_CONTAINER_NOT_READY|YOUTUBE_INIT_FAILED_5\d\d|MEDIA_DOWNLOAD_FAILED|LINKEDIN_VIDEO_NOT_READY|LINKEDIN_VIDEO_(?:INIT|PART|FINALIZE|STATUS)_5\d\d)$/));
                ambiguous = (!stagingFailure && Boolean(result.errorCode?.match(/(?:EXCEPTION|NETWORK_ERROR|_5\d\d)$/))) ||
                  Boolean(result.success && !result.externalPostId);
              } catch {
                ambiguous = true;
              }
            }
          }
        }
        const limited = Boolean(result.errorCode?.endsWith('_429'));
        const retryable = limited || stagingFailure;
        const reconnect = result.errorCode === 'RECONNECT' || result.errorCode?.endsWith('_401');
        const status = ambiguous || result.processing ? 'processing' : result.success ? 'published' : reconnect ? 'reauthorization_required' : 'failed';
        const message = ambiguous ? 'Provider outcome is unknown. Check the destination before posting again.' :
          result.processing ? 'YouTube accepted the upload and is still processing it.' :
          limited ? 'Provider rate limit reached.' : stagingFailure ? 'Temporary failure while preparing the media.' :
          reconnect ? 'Reconnect the destination and retry.' :
          result.success ? null : (result.errorMessage || result.actionRequired || (result.errorCode
            ? 'Provider rejected this post (' + result.errorCode + '). Check permissions and media requirements.'
            : 'Provider rejected this post.'));
        const recorded = await db.rpc('record_publishing_result', {
          job: job.id, target_id: target.id, result: {
            status, error_code: result.errorCode, error_message: message, retryable,
            external_post_id: result.externalPostId, external_post_url: result.externalPostUrl,
          },
        });
        if (recorded.error) throw recorded.error;
        return retryable;
      } catch (err) {
        console.error(`Error during platform publish for ${target.platform}:`, err);
        try {
          await db.rpc('record_publishing_result', {
            job: job.id, target_id: target.id, result: {
              status: 'failed', error_code: 'PUBLISH_EXCEPTION',
              error_message: err instanceof Error ? err.message : 'Platform publishing failed',
              retryable: false,
            },
          });
        } catch {}
        return false;
      }
    }));

  const retry = results.some(Boolean) && job.retry_count < job.max_retries;
  const nextRun = retry ? new Date(Date.now() + 60_000 * 2 ** job.retry_count).toISOString() : null;
  const finished = await db.rpc('finish_publishing_job', { job: job.id, next_run: nextRun });
  if (finished.error) throw finished.error;

  // If at least one platform successfully published, mark post as published so successful live posts are preserved
  try {
    const { data: targets } = await db.from('post_targets').select('status, platform, external_post_url').eq('post_id', job.post_id);
    const published = targets?.filter((t) => t.status === 'published') || [];
    if (published.length > 0 && !nextRun) {
      await db.from('posts').update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', job.post_id);

      // Automated WhatsApp notification via OpenWA Gateway
      try {
        const { sendOpenWaMessage } = await import('@/lib/whatsapp/openwa');
        const platformsList = published.map((p) => p.platform.toUpperCase()).join(', ');
        const urlsList = published.map((p) => p.external_post_url).filter(Boolean).join('\n');
        await sendOpenWaMessage({
          phoneNumber: '919445648373',
          message: `🚀 SocialSync AI Live Alert: Post "${post.title || 'Untitled'}" is now live on ${platformsList}!${urlsList ? `\n\nLive Links:\n${urlsList}` : ''}`,
        }).catch((waErr) => console.warn('Automated OpenWA alert non-critical:', waErr.message));
      } catch (waAlertErr) {
        console.warn('OpenWA alert non-critical notice:', waAlertErr);
      }
    }
  } catch (statusSyncErr) {
    console.warn('Could not sync composite post status:', statusSyncErr);
  }

  return { jobId: job.id, postId: job.post_id, retryAt: nextRun, status: finished.data };
}
