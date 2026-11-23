import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { matchesMediaSignature, mediaExtensions, mediaSizeLimit, signMedia } from '@/lib/publishing/media';
import { inspectUploadedMedia, InvalidMediaError, MediaToolsError } from '@/lib/publishing/media-inspection';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (Number(req.headers.get('content-length')) > mediaSizeLimit('video/mp4') + 65536) {
    return NextResponse.json({ error: 'Upload exceeds 100 MB' }, { status: 413 });
  }
  try {
    const file = (await req.formData()).get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Choose a JPEG, PNG, WebP, MP4, MOV or WebM file' }, { status: 400 });
    }
    let fileType = (file.type || '').split(';')[0].trim().toLowerCase();
    if (!fileType || fileType === 'application/octet-stream') {
      const ext = (file.name || '').split('.').pop()?.toLowerCase();
      if (ext === 'mp4') fileType = 'video/mp4';
      else if (ext === 'mov') fileType = 'video/quicktime';
      else if (ext === 'webm') fileType = 'video/webm';
      else if (ext === 'jpg' || ext === 'jpeg') fileType = 'image/jpeg';
      else if (ext === 'png') fileType = 'image/png';
      else if (ext === 'webp') fileType = 'image/webp';
    }
    if (!Object.hasOwn(mediaExtensions, fileType)) {
      return NextResponse.json({ error: 'Choose a JPEG, PNG, WebP, MP4, MOV or WebM file' }, { status: 400 });
    }
    if (!file.size || file.size > mediaSizeLimit(fileType)) {
      return NextResponse.json({ error: 'Upload is empty or exceeds the media size limit' }, { status: 413 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!matchesMediaSignature(bytes, fileType)) {
      return NextResponse.json({ error: 'File contents do not match its declared type' }, { status: 415 });
    }
    const db = createAdminClient();
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const existing = () => db.from('media_assets').select('*')
      .eq('user_id', user.id).eq('checksum_sha256', checksum).maybeSingle();
    const respond = async (asset: { file_path: string; thumbnail_path?: string }, status: number) => {
      const [previewUrl, thumbnailUrl] = await Promise.all([
        signMedia(asset.file_path, user.id).catch(() => undefined),
        asset.thumbnail_path ? signMedia(asset.thumbnail_path, user.id).catch(() => undefined) : undefined,
      ]);
      return NextResponse.json({ success: true, asset, previewUrl, thumbnailUrl, duplicate: status === 200 }, { status });
    };
    const lookup = await existing();
    if (lookup.error) throw lookup.error;
    if (lookup.data) return respond(lookup.data, 200);

    const media = await inspectUploadedMedia(bytes, fileType);
    const path = user.id + '/' + randomUUID() + '.' + mediaExtensions[fileType];
    const thumbnailPath = path + '.thumb.jpg';
    const store = db.storage.from('media-assets');
    const { error: uploadError } = await store.upload(path, bytes, { contentType: file.type });
    if (uploadError) return NextResponse.json({ error: 'Could not store the uploaded file' }, { status: 502 });
    let hasThumbnail = false;
    if (media.thumbnail && Buffer.isBuffer(media.thumbnail) && media.thumbnail.length > 0) {
      const thumbUpload = await store.upload(thumbnailPath, media.thumbnail, { contentType: 'image/jpeg' });
      hasThumbnail = !thumbUpload.error;
    }
    const { data: asset, error } = await db.from('media_assets').insert({
      user_id: user.id, file_name: file.name.slice(0, 255), file_path: path, file_size: file.size,
      mime_type: fileType, media_type: fileType.startsWith('video/') ? 'video' : 'image',
      checksum_sha256: checksum, width: media.width, height: media.height,
      duration_seconds: media.duration, video_codec: media.codec, thumbnail_path: hasThumbnail ? thumbnailPath : null,
    }).select().single();
    if (error) {
      await store.remove(hasThumbnail ? [path, thumbnailPath] : [path]);
      if (error.code === '23505') {
        const reused = await existing();
        if (reused.data) return respond(reused.data, 200);
      }
      return NextResponse.json({ error: 'Could not save the uploaded media record' }, { status: 502 });
    }
    return respond(asset, 201);
  } catch (error) {
    if (error instanceof InvalidMediaError) return NextResponse.json({ error: error.message }, { status: 415 });
    if (error instanceof MediaToolsError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: 'Media upload is unavailable' }, { status: 503 });
  }
}
