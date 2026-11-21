import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';
import { postIdSchema } from '@/lib/publishing/campaign';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const id = postIdSchema.safeParse(req.nextUrl.searchParams.get('postId'));
  if (!id.success) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  const { data, error } = await createAdminClient().from('posts')
    .select('id,title,status,scheduled_for,published_at,post_targets(*)')
    .eq('id', id.data).eq('user_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load publishing status' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Post unavailable' }, { status: 404 });
  return NextResponse.json({ success: true, post: data });
}
