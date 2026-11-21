import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';
import { captionSchema, manageCampaign, postIdSchema } from '@/lib/publishing/campaign';
import { signMedia } from '@/lib/publishing/media';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const id = postIdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  const { data, error } = await createAdminClient().from('posts')
    .select('*,post_variants(*),post_targets(*),media:media_assets(file_path,media_type,user_id)')
    .eq('id', id.data).eq('user_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load the post' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Post unavailable' }, { status: 404 });
  const media = data.media as unknown as { file_path: string; media_type: string; user_id: string } | null;
  const previewUrl = media?.user_id === user.id ? await signMedia(media.file_path, user.id).catch(() => null) : null;
  return NextResponse.json({ success: true, post: { ...data, media: undefined }, previewUrl, mediaType: previewUrl ? media?.media_type : null });
}

const Edit = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  variants: z.array(z.object({ id: postIdSchema, caption: captionSchema })).max(4).default([]),
});

export async function PUT(req: NextRequest, { params }: Context) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const id = postIdSchema.safeParse((await params).id);
  const edit = Edit.safeParse(await req.json().catch(() => null));
  if (!id.success || !edit.success) return NextResponse.json({ error: 'Invalid post edits' }, { status: 400 });
  const { error, data } = await createAdminClient().rpc('edit_campaign', {
    owner_id: user.id, campaign_id: id.data, campaign_title: edit.data.title ?? null, variants: edit.data.variants,
  });
  if (error) return NextResponse.json({ error: 'Could not save post edits' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Post cannot be edited in its current state' }, { status: 409 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const id = postIdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  return manageCampaign(user.id, id.data, 'cancel');
}
