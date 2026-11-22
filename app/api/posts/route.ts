import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';
import { postIdSchema } from '@/lib/publishing/campaign';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const userId = user.id;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view');
    const status = searchParams.get('status') ?? (view && ['draft', 'scheduled', 'published'].includes(view) ? view : null);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '50', 10) || 50));

    const supabase = createAdminClient();

    let query = supabase
      .from('posts')
      .select('*, post_variants(*), post_targets(*)')
      .eq('user_id', userId)
      .order(view === 'scheduled' || view === 'queue' ? 'scheduled_for' : 'created_at', {
        ascending: view === 'scheduled' || view === 'queue', nullsFirst: view === 'queue',
      })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (view === 'queue') {
      query = query.in('status', ['approved', 'scheduled', 'publishing', 'processing']);
    }
    const post = searchParams.get('post');
    if (post) {
      const id = postIdSchema.safeParse(post);
      if (!id.success) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
      query = query.eq('id', id.data);
    }
    if (status === 'scheduled') {
      const from = Date.parse(searchParams.get('from') ?? '');
      const until = Date.parse(searchParams.get('until') ?? '');
      if (Number.isFinite(from)) query = query.gte('scheduled_for', new Date(from).toISOString());
      if (Number.isFinite(until)) query = query.lt('scheduled_for', new Date(until).toISOString());
    }

    const { data: posts, error } = await query;

    if (error) return NextResponse.json({ error: 'Could not load posts' }, { status: 503 });

    return NextResponse.json({
      success: true,
      posts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, posts: [] }, { status: 500 });
  }
}
