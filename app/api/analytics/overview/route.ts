import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const range = Number(req.nextUrl.searchParams.get('days'));
  const days = [7, 30, 90].includes(range) ? range : 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const db = createAdminClient();
  const counts = ['published', 'failed', 'publishing', 'scheduled', 'approved'].map((status) => db.from('posts')
    .select('id', { head: true, count: 'exact' }).eq('user_id', user.id).eq('status', status).gte('updated_at', since));
  const [published, failed, publishing, scheduled, approved, accounts] = await Promise.all([
    ...counts, db.from('social_accounts').select('id', { head: true, count: 'exact' })
      .eq('user_id', user.id).eq('status', 'active'),
  ]);
  if ([published, failed, publishing, scheduled, approved, accounts].some((result) => result.error)) {
    return NextResponse.json({ error: 'Could not load analytics' }, { status: 503 });
  }
  return NextResponse.json({ success: true, overview: {
    totalPosts: published.count, failedPosts: failed.count, connectedPlatforms: accounts.count,
    queuedPosts: (scheduled.count ?? 0) + (approved.count ?? 0) + (publishing.count ?? 0),
    days,
  } });
}
