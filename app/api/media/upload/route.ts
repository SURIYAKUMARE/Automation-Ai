import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { matchesMediaSignature, mediaExtensions, mediaSizeLimit, signMedia } from '@/lib/publishing/media';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (Number(req.headers.get('content-length')) > mediaSizeLimit('video/mp4') + 65536) {
    return NextResponse.json({ error: 'Upload exceeds 100 MB' }, { status: 413 });
  }
  try {
    const file = (await req.formData()).get('file');
    if (!file || typeof file === 'string' || !Object.hasOwn(mediaExtensions, file.type)) {
      return NextResponse.json({ error: 'Choose a JPEG, PNG, WebP, MP4, MOV or WebM file' }, { status: 400 });
    }
    if (!file.size || file.size > mediaSizeLimit(file.type)) {
      return NextResponse.json({ error: 'Upload is empty or exceeds the media size limit' }, { status: 413 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!matchesMediaSignature(bytes, file.type)) {
      return NextResponse.json({ error: 'File contents do not match its declared type' }, { status: 415 });
    }
    const db = createAdminClient();
    const path = user.id + '/' + randomUUID() + '.' + mediaExtensions[file.type];
    const store = db.storage.from('media-assets');
    const { error: uploadError } = await store.upload(path, bytes, { contentType: file.type });
    if (uploadError) return NextResponse.json({ error: 'Could not store the uploaded file' }, { status: 502 });
    const { data: asset, error } = await db.from('media_assets').insert({
      user_id: user.id, file_name: file.name.slice(0, 255), file_path: path, file_size: file.size,
      mime_type: file.type, media_type: file.type.startsWith('video/') ? 'video' : 'image',
    }).select().single();
    if (error) {
      await store.remove([path]);
      return NextResponse.json({ error: 'Could not save the uploaded media record' }, { status: 502 });
    }
    const previewUrl = await signMedia(path, user.id).catch(() => undefined);
    return NextResponse.json({ success: true, asset, previewUrl, mediaUrl: previewUrl }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Media upload is unavailable' }, { status: 503 });
  }
}
