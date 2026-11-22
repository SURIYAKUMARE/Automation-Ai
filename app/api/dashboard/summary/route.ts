import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  try {
    const db = createAdminClient();
    const posts = (status: 'published' | 'scheduled' | 'pending_approval') => db.from('posts')
      .select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', status);
    const requestedStart = Date.parse(req.nextUrl.searchParams.get('from') ?? '');
    const today = Number.isFinite(requestedStart) && Math.abs(requestedStart - Date.now()) < 36 * 3600_000 ? requestedStart : Date.now();
    const [uploads, published, scheduled, pending, failed, accounts, recent, upcoming] = await Promise.all([
      db.from('media_assets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      posts('published'), posts('scheduled'), posts('pending_approval'),
      db.from('post_targets').select('id,posts!inner(user_id)', { count: 'exact', head: true })
        .eq('posts.user_id', user.id).in('status', ['failed', 'reauthorization_required']),
      db.from('social_accounts').select('platform').eq('user_id', user.id).eq('status', 'active'),
      db.from('posts').select('id,title,status,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
      db.from('posts').select('scheduled_for').eq('user_id', user.id).eq('status', 'scheduled')
        .gte('scheduled_for', new Date(today).toISOString()).lt('scheduled_for', new Date(today + 8 * 86_400_000).toISOString()),
    ]);
    if ([uploads, published, scheduled, pending, failed, accounts, recent, upcoming].some((result) => result.error)) {
      return NextResponse.json({ error: 'Could not load dashboard activity' }, { status: 503 });
    }
    return NextResponse.json({
      uploads: uploads.count, published: published.count, scheduled: scheduled.count, failed: failed.count,
      connectedPlatforms: new Set(accounts.data?.map((account) => account.platform)).size, recent: recent.data,
      connectedAccounts: accounts.data?.length ?? 0, pending: pending.count, upcoming: upcoming.data,
    });
  } catch {
    return NextResponse.json({ error: 'Could not load dashboard activity' }, { status: 503 });
  }
}
