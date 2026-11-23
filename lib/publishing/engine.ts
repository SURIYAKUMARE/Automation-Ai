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
  if (!account.token_expires_at || Date.parse(account.token_expires_at) > Date.now() + 60_000) {
    return decryptToken(account.encrypted_access_token);
  }
  const adapter = getPlatformAdapter(account.platform);
  if (!adapter.refreshAccessToken || !account.encrypted_refresh_token) return null;
  const refreshed = await adapter.refreshAccessToken(decryptToken(account.encrypted_refresh_token));
  if (!refreshed.accessToken) return null;
  const { data, error } = await db.from('social_accounts').update({
    encrypted_access_token: encryptToken(refreshed.accessToken),
    ...(refreshed.refreshToken ? { encrypted_refresh_token: encryptToken(refreshed.refreshToken) } : {}),
    token_expires_at: refreshed.expiresInSeconds ? new Date(Date.now() + refreshed.expiresInSeconds * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('id', account.id).eq('status', 'active').eq('encrypted_access_token', account.encrypted_access_token).select('id');
  if (error || !data.length) return null;
  return refreshed.accessToken;
}

const eligible = ['draft', 'ready', 'approved', 'scheduled', 'pending_approval', 'failed', 'reauthorization_required'];

export async function dispatchCampaign(db: Database, ownerId: string, campaignId: string) {
  try {
    let job: ClaimedJob | undefined;
    const { data, error } = await db.rpc('claim_campaign_publishing_job', {
      owner_id: ownerId, campaign_id: campaignId,
    });
    if (!error && data?.[0]) {
      job = data[0] as ClaimedJob;
    } else if (error?.code === 'PGRST202' || error?.message?.includes('claim_campaign_publishing_job')) {
      // Direct claim fallback when RPC is pending migration in remote PostgreSQL
      const { data: queued } = await db.from('publishing_jobs')
        .select('*')
        .eq('user_id', ownerId)
        .eq('post_id', campaignId)
        .eq('status', 'queued')
        .lte('run_at', new Date().toISOString())
        .order('run_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (queued) {
        await db.from('posts').update({ status: 'publishing', updated_at: new Date().toISOString() })
          .eq('id', campaignId).eq('user_id', ownerId);
        const { data: claimed } = await db.from('publishing_jobs')
          .update({ status: 'running', updated_at: new Date().toISOString() })
          .eq('id', queued.id)
          .eq('status', 'queued')
          .select()
          .maybeSingle();
        if (claimed) job = claimed as ClaimedJob;
      }
    } else if (error) {
      throw error;
    }
    if (job) await executePostPublishing(db, job);
  } catch (error) {
    // The worker handles queued jobs and reconciles interrupted dispatches.
    console.warn('Immediate publishing could not finish', error);
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

  const mediaUrl = media?.user_id === job.user_id && media.file_path
    ? await signMedia(media.file_path, job.user_id, 86400).catch(() => undefined)
    : undefined;

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
          result.success ? null : (result.actionRequired || (result.errorCode
            ? 'Provider rejected this post (' + result.errorCode + '). Check permissions and media requirements.'
            : result.errorMessage || 'Provider rejected this post.'));
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
  return { jobId: job.id, postId: job.post_id, retryAt: nextRun, status: finished.data };
}
