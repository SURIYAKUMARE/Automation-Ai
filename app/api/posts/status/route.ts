import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId parameter' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: post } = await supabase
      .from('posts')
      .select('id, title, status, publishing_mode, scheduled_for, published_at, post_targets(*)')
      .eq('id', postId)
      .maybeSingle();

    if (!post) {
      return NextResponse.json({
        postId,
        status: 'published',
        synced: true,
      });
    }

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
