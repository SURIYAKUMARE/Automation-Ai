import { decryptToken } from '@/lib/security/encryption';
import { createAdminClient } from '@/lib/supabase/admin';

function count(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export async function getPostMetrics(userId: string) {
  const db = createAdminClient();
  const { data, error } = await db.from('post_targets')
    .select('id, platform, status, external_post_id, published_at, posts!inner(title,user_id), social_accounts(user_id,status,encrypted_access_token,granted_scopes)')
    .eq('posts.user_id', userId).in('status', ['published', 'failed', 'processing', 'reauthorization_required'])
    .order('updated_at', { ascending: false }).limit(20);
  if (error) throw error;

  return Promise.all(data.map(async (row) => {
    const account = row.social_accounts as unknown as { user_id: string; status: string; encrypted_access_token: string; granted_scopes: string[] } | null;
    const title = (row.posts as unknown as { title?: string })?.title || 'Untitled post';
    const base = { id: row.id, title, platform: row.platform, status: row.status, publishedAt: row.published_at };
    const empty = { reach: null, impressions: null, views: null, likes: null, comments: null, shares: null };
    if (row.status !== 'published' || !row.external_post_id || account?.user_id !== userId || account.status !== 'active') {
      return { ...base, metrics: empty, syncedAt: null };
    }
    if (row.platform === 'linkedin' && !account.granted_scopes?.includes('r_member_postAnalytics')) {
      return { ...base, metrics: empty, syncedAt: null };
    }
    const { data: snapshot } = await db.from('analytics_snapshots').select('raw_api_data,synced_at')
      .eq('user_id', userId).eq('post_target_id', row.id)
      .gte('synced_at', new Date(Date.now() - 15 * 60_000).toISOString())
      .order('synced_at', { ascending: false }).limit(1).maybeSingle();
    if (snapshot) return { ...base, metrics: { ...empty, ...snapshot.raw_api_data }, syncedAt: snapshot.synced_at };
    try {
      const token = decryptToken(account.encrypted_access_token);
      if (row.platform === 'linkedin') {
        const urn = row.external_post_id;
        const kind = urn.startsWith('urn:li:ugcPost:') ? 'ugc' : urn.startsWith('urn:li:share:') ? 'share' : null;
        if (!kind) return { ...base, metrics: empty, syncedAt: null };
        const values = { impressions: 'IMPRESSION', reach: 'MEMBERS_REACHED', likes: 'REACTION', comments: 'COMMENT', shares: 'RESHARE' };
        const entries = await Promise.all(Object.entries(values).map(async ([metric, queryType]) => {
          const url = 'https://api.linkedin.com/rest/memberCreatorPostAnalytics?q=entity&entity=(' +
            kind + ':' + encodeURIComponent(urn) + ')&aggregation=TOTAL&queryType=' + queryType;
          try {
            const response = await fetch(url, { signal: AbortSignal.timeout(6000), headers: {
              Authorization: 'Bearer ' + token, 'X-Restli-Protocol-Version': '2.0.0',
              'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202610',
            } });
            return [metric, response.ok ? count((await response.json()).elements?.[0]?.count) : null] as const;
          } catch { return [metric, null] as const; }
        }));
        return save({ ...empty, ...Object.fromEntries(entries) });
      }
      const version = process.env.META_GRAPH_VERSION || 'v23.0';
      const url = row.platform === 'youtube' ? new URL('https://www.googleapis.com/youtube/v3/videos') :
        new URL('https://graph.facebook.com/' + version + '/' + encodeURIComponent(row.external_post_id));
      if (row.platform === 'youtube') {
        url.searchParams.set('part', 'statistics');
        url.searchParams.set('id', row.external_post_id);
      } else {
        url.searchParams.set('fields', row.platform === 'instagram' ? 'like_count,comments_count' :
          'reactions.limit(0).summary(true),comments.limit(0).summary(true),shares');
      }
      const insightFields = row.platform === 'instagram' ? 'reach,views,shares' : row.platform === 'facebook' ? 'post_media_view' : null;
      const insights = insightFields ? (async () => {
        const insightUrl = new URL(url.origin + url.pathname + '/insights');
        insightUrl.searchParams.set('metric', insightFields);
        const response = await fetch(insightUrl, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(6000) });
        const payload = response.ok ? await response.json() : {};
        return Object.fromEntries((payload.data || []).map((item: { name: string; values?: { value: unknown }[] }) =>
          [item.name, count(item.values?.[0]?.value)]));
      })().catch(() => ({} as Record<string, number | null>)) : Promise.resolve({} as Record<string, number | null>);
      const response = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(6000) });
      const payload = response.ok ? await response.json() : {};
      const insightValues = await insights;
      const stats = row.platform === 'youtube' ? payload.items?.[0]?.statistics : payload;
      const metrics = {
        ...empty,
        views: count(stats?.viewCount ?? insightValues.views ?? insightValues.post_media_view),
        reach: count(insightValues.reach),
        likes: count(stats?.likeCount ?? stats?.like_count ?? stats?.reactions?.summary?.total_count),
        comments: count(stats?.commentCount ?? stats?.comments_count ?? stats?.comments?.summary?.total_count),
        shares: count(stats?.shares?.count ?? insightValues.shares),
      };
      return save(metrics);
    } catch {
      return { ...base, metrics: empty, syncedAt: null };
    }
    async function save(metrics: Record<keyof typeof empty, number | null>) {
      if (Object.values(metrics).every((value) => value === null)) return { ...base, metrics, syncedAt: null };
      const syncedAt = new Date().toISOString();
      await db.from('analytics_snapshots').insert({
        user_id: userId, post_target_id: row.id, platform: row.platform, external_post_id: row.external_post_id,
        raw_api_data: metrics, synced_at: syncedAt,
      });
      return { ...base, metrics, syncedAt };
    }
  }));
}
