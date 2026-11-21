import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOwnedStoragePath } from '@/lib/publishing/media';
import { postIdSchema } from '@/lib/publishing/campaign';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const id = postIdSchema.safeParse((await req.json().catch(() => null))?.mediaId);
  if (!id.success) return NextResponse.json({ error: 'Choose an uploaded media ID' }, { status: 400 });
  const db = createAdminClient();
  const { data, error } = await db.from('media_assets').select('file_path').eq('id', id.data).eq('user_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not read upload' }, { status: 503 });
  if (!data || !isOwnedStoragePath(data.file_path, user.id)) return NextResponse.json({ error: 'Upload unavailable' }, { status: 404 });
  const linked = await db.from('posts').select('id').eq('media_asset_id', id.data).limit(1);
  if (linked.error) return NextResponse.json({ error: 'Could not check media references' }, { status: 503 });
  if (linked.data.length) return NextResponse.json({ error: 'This upload is attached to a saved post' }, { status: 409 });
  const removed = await db.storage.from('media-assets').remove([data.file_path]);
  if (removed.error) return NextResponse.json({ error: 'Could not remove the stored file' }, { status: 503 });
  const deleted = await db.from('media_assets').delete().eq('id', id.data).eq('user_id', user.id);
  if (deleted.error) return NextResponse.json({ error: 'Could not remove the media record' }, { status: 503 });
  return NextResponse.json({ success: true, mediaId: id.data });
}
export { POST as DELETE };
