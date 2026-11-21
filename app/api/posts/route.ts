import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const userId = user.id;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '50', 10) || 50));

    const supabase = createAdminClient();

    let query = supabase
      .from('posts')
      .select('*, post_variants(*), post_targets(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
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
