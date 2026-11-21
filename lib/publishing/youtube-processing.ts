import type { createAdminClient } from '@/lib/supabase/admin';
import { getAccountAccessToken } from '@/lib/publishing/engine';

type Database = ReturnType<typeof createAdminClient>;

export async function reconcileYouTubeProcessing(db: Database) {
  const { data, error } = await db.from('post_targets')
    .select('id,external_post_id,post:posts!inner(user_id),account:social_accounts(*)')
    .eq('platform', 'youtube').eq('status', 'processing').not('external_post_id', 'is', null)
    .lt('updated_at', new Date(Date.now() - 60_000).toISOString())
    .order('updated_at').limit(3);
  if (error) throw error;
  return Promise.all(data.map(async (target) => {
    const account = target.account as unknown as Parameters<typeof getAccountAccessToken>[1] | null;
    const post = target.post as unknown as { user_id: string };
    let outcome: 'processing' | 'published' | 'failed' = 'processing';
    let detail: string | null = 'Waiting for YouTube to finish processing.';
    try {
      const token = account?.user_id === post.user_id && account.status === 'active'
        ? await getAccountAccessToken(db, account).catch(() => null) : null;
      if (token) {
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.search = new URLSearchParams({ id: target.external_post_id, part: 'status' }).toString();
        const response = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(8000) });
        if (response.ok) {
          const status = (await response.json()).items?.[0]?.status?.uploadStatus;
          if (status === 'processed') {
            outcome = 'published';
            detail = null;
          } else if (['failed', 'rejected', 'deleted'].includes(status)) {
            outcome = 'failed';
            detail = 'YouTube rejected or removed this upload. Review it in YouTube Studio.';
          }
        }
      } else {
        detail = 'Reconnect YouTube so the worker can confirm processing. The upload receipt is retained.';
      }
    } catch {
      detail = 'The worker could not check YouTube yet. The upload receipt is retained.';
    }
    const update = await db.rpc('report_youtube_processing', {
      destination_id: target.id, receipt_id: target.external_post_id, outcome, detail,
    });
    if (update.error) throw update.error;
    return update.data === true;
  }));
}
