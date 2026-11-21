import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

type Snapshot = { platform: string; post_target_id: string; raw_api_data: { likes?: number; comments?: number }; post_targets: { published_at: string | null } };
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const timezone = req.nextUrl.searchParams.get('timezone') || 'UTC';
  let clock: Intl.DateTimeFormat;
  try {
    clock = new Intl.DateTimeFormat('en', { timeZone: timezone, hour: 'numeric', hourCycle: 'h23' });
  } catch {
    return NextResponse.json({ error: 'Choose a valid timezone' }, { status: 400 });
  }
  const { data, error } = await createAdminClient().from('analytics_snapshots')
    .select('platform,post_target_id,raw_api_data,post_targets!inner(published_at)')
    .eq('user_id', user.id).eq('post_targets.status', 'published')
    .gte('post_targets.published_at', new Date(Date.now() - 90 * 86_400_000).toISOString())
    .order('synced_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: 'Could not load historical timing data' }, { status: 503 });

  const results = new Map<string, Map<number, number[]>>();
  const seen = new Set<string>();
  for (const row of data as unknown as Snapshot[]) {
    const { likes, comments } = row.raw_api_data;
    const publishedAt = row.post_targets.published_at;
    if (seen.has(row.post_target_id) || likes == null || comments == null || !publishedAt) continue;
    seen.add(row.post_target_id);
    const hour = Math.floor(Number(clock.format(new Date(publishedAt))) / 4) * 4;
    const slots = results.get(row.platform) ?? new Map<number, number[]>();
    results.set(row.platform, slots);
    const scores = slots.get(hour) ?? [];
    slots.set(hour, [...scores, likes + comments]);
  }
  const suggestions = Array.from(results.entries()).flatMap(([platform, slots]) => {
    const windows = Array.from(slots.entries()).filter(([, scores]) => scores.length >= 2).map(([hour, scores]) => ({
      hour, samples: scores.length, mean: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    })).sort((a, b) => b.mean - a.mean);
    return windows.length >= 2 ? [{ platform, ...windows[0], comparedWindows: windows.length }] : [];
  });
  return NextResponse.json({ timezone, suggestions, basis: 'Average likes plus comments on published posts in the last 90 days' });
}
