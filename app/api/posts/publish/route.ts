import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { manageCampaign, postIdSchema } from '@/lib/publishing/campaign';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchCampaign } from '@/lib/publishing/engine';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const input = postIdSchema.safeParse((await req.json().catch(() => null))?.postId);
  if (!input.success) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });

  const db = createAdminClient();
  const { data: post } = await db.from('posts').select('id, status, user_id').eq('id', input.data).eq('user_id', user.id).maybeSingle();
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  // If already approved or publishing, trigger direct execution without resetting job
  if (post.status === 'approved' || post.status === 'publishing') {
    await dispatchCampaign(db, user.id, input.data);
    return NextResponse.json({ success: true, post });
  }

  const res = await manageCampaign(user.id, input.data, 'queue', new Date().toISOString());
  if (res.ok) await dispatchCampaign(db, user.id, input.data);
  return res;
}
