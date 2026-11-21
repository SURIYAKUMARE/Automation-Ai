import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAccountAccessToken } from '@/lib/publishing/engine';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  try {
    const db = createAdminClient();
    const { data, error } = await db.from('social_accounts').select('*').eq('user_id', user.id)
      .eq('status', 'active').in('platform', ['facebook', 'instagram', 'youtube']).limit(10);
    if (error) throw error;

    const date = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const accounts = await Promise.all(data.map(async (account) => {
      const { data: history } = await db.from('social_account_snapshots').select('observed_on,audience_count')
        .eq('account_id', account.id).eq('user_id', user.id).gte('observed_on', since)
        .order('observed_on');
      const observations = history ?? [];
      let latest = observations.at(-1);
      if (latest?.observed_on !== date) {
        const fresh = await observe(account).catch(() => null);
        if (fresh !== null) {
          latest = { observed_on: date, audience_count: fresh };
          await db.from('social_account_snapshots').upsert({
            ...latest, user_id: user.id, account_id: account.id,
          }, { onConflict: 'account_id,observed_on' });
        }
      }
      const earliest = observations[0];
      return {
        id: account.id, platform: account.platform, name: account.account_name,
        count: latest?.audience_count ?? null, observedOn: latest?.observed_on ?? null,
        change: earliest && latest && earliest.observed_on !== latest.observed_on ?
          latest.audience_count - earliest.audience_count : null,
        since: earliest?.observed_on ?? null,
        rounded: account.platform === 'youtube',
      };
    }));
    return NextResponse.json({ accounts });

    async function observe(account: NonNullable<typeof data>[number]) {
      const token = await getAccountAccessToken(db, account);
      if (!token) return null;
      const isYouTube = account.platform === 'youtube';
      const version = process.env.META_GRAPH_VERSION || 'v23.0';
      const url = isYouTube ? new URL('https://www.googleapis.com/youtube/v3/channels') :
        new URL('https://graph.facebook.com/' + version + '/' + encodeURIComponent(account.external_account_id));
      if (isYouTube) {
        url.searchParams.set('part', 'statistics');
        url.searchParams.set('id', account.external_account_id);
      } else {
        url.searchParams.set('fields', 'followers_count');
      }
      const response = await fetch(url, {
        headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return null;
      const result = await response.json();
      const statistics = result.items?.[0]?.statistics;
      const value = isYouTube ? (statistics?.hiddenSubscriberCount ? null : statistics?.subscriberCount) : result.followers_count;
      if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) return null;
      const total = Number(value);
      return Number.isSafeInteger(total) && total >= 0 ? total : null;
    }
  } catch {
    return NextResponse.json({ error: 'Could not load follower and subscriber counts' }, { status: 503 });
  }
}
