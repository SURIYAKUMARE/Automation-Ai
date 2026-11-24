import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { mediaExtensions, mediaSizeLimit, signMedia } from '@/lib/publishing/media';

async function generateSignedUploadUrl(user: { id: string }, rawFileName?: string | null, rawFileType?: string | null, rawFileSize?: number) {
  const fileName = rawFileName || 'upload';
  let fileType = (rawFileType || '').split(';')[0].trim().toLowerCase();
  const fileSize = Number(rawFileSize) || 0;

  // Fallback for mobile devices that omit or use generic octet-stream MIME
  if (!fileType || fileType === 'application/octet-stream') {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'mp4') fileType = 'video/mp4';
    else if (ext === 'mov') fileType = 'video/quicktime';
    else if (ext === 'webm') fileType = 'video/webm';
    else if (ext === 'jpg' || ext === 'jpeg') fileType = 'image/jpeg';
    else if (ext === 'png') fileType = 'image/png';
    else if (ext === 'webp') fileType = 'image/webp';
  }

  if (!Object.hasOwn(mediaExtensions, fileType)) {
    return { error: 'Choose a JPEG, PNG, WebP, MP4, MOV or WebM file', status: 400 };
  }

  if (fileSize > mediaSizeLimit(fileType)) {
    return { error: 'Upload exceeds maximum allowed size', status: 413 };
  }

  const db = createAdminClient();
  const ext = mediaExtensions[fileType];
  const storagePath = `${user.id}/${randomUUID()}.${ext}`;

  try {
    const { data, error } = await db.storage
      .from('media-assets')
      .createSignedUploadUrl(storagePath);

    if (error || !data?.signedUrl) {
      console.error('Failed to create signed upload URL:', error);
      return { error: 'Could not initialize direct upload', status: 502 };
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
      path: storagePath,
      token: data.token,
      fileType,
      status: 200,
    };
  } catch (err) {
    console.error('Direct upload initialization exception:', err);
    return { error: 'Storage service unavailable', status: 503 };
  }
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const result = await generateSignedUploadUrl(
    user,
    searchParams.get('fileName'),
    searchParams.get('fileType'),
    Number(searchParams.get('fileSize')) || 0
  );

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const result = await generateSignedUploadUrl(user, body.fileName, body.fileType, body.fileSize);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { path, fileName, fileType, fileSize, width, height, duration } = body;

    // If client called POST to initialize upload (without path)
    if (!path && fileName) {
      const initResult = await generateSignedUploadUrl(user, fileName, fileType, fileSize);
      if ('error' in initResult) {
        return NextResponse.json({ error: initResult.error }, { status: initResult.status });
      }
      return NextResponse.json(initResult);
    }

    if (!path || typeof path !== 'string' || !path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
    }

    const db = createAdminClient();
    const isVideo = (fileType || '').startsWith('video/');

    const { data: asset, error } = await db.from('media_assets').insert({
      user_id: user.id,
      file_name: (fileName || 'upload').slice(0, 255),
      file_path: path,
      file_size: Number(fileSize) || 0,
      mime_type: fileType || (isVideo ? 'video/mp4' : 'image/jpeg'),
      media_type: isVideo ? 'video' : 'image',
      width: Number(width) || (isVideo ? 1920 : 1080),
      height: Number(height) || (isVideo ? 1080 : 1080),
      duration_seconds: isVideo ? (Number(duration) || 30) : null,
      video_codec: isVideo ? (fileType?.includes('webm') ? 'vp8' : 'h264') : null,
    }).select().single();

    if (error || !asset) {
      console.error('Failed to register uploaded media asset:', error);
      return NextResponse.json({ error: 'Could not record media asset' }, { status: 502 });
    }

    const previewUrl = await signMedia(asset.file_path, user.id).catch(() => undefined);

    return NextResponse.json({
      success: true,
      asset,
      previewUrl,
    }, { status: 201 });
  } catch (err) {
    console.error('Complete upload exception:', err);
    return NextResponse.json({ error: 'Could not complete upload' }, { status: 500 });
  }
}
