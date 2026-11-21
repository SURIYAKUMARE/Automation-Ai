import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { MediaType } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = (formData.get('userId') as string) || 'current-user';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const mimeType = file.type;
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload an image (PNG, JPEG, WEBP) or video (MP4, MOV).' },
        { status: 400 }
      );
    }

    // Size check
    const maxImageSize = 15 * 1024 * 1024; // 15MB
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    if (isImage && file.size > maxImageSize) {
      return NextResponse.json({ error: 'Image exceeds max size of 15MB' }, { status: 400 });
    }
    if (isVideo && file.size > maxVideoSize) {
      return NextResponse.json({ error: 'Video exceeds max size of 100MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
    const storagePath = `${userId}/${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${fileExt}`;

    const supabase = createAdminClient();

    // Auto-create media-assets bucket if it does not exist
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.some((b) => b.name === 'media-assets')) {
        await supabase.storage.createBucket('media-assets', {
          public: true,
          fileSizeLimit: 100 * 1024 * 1024,
        });
      }
    } catch (bucketErr) {
      console.warn('Storage bucket auto-creation skipped:', bucketErr);
    }

    // Upload to 'media-assets' bucket
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('media-assets')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    const mediaType: MediaType = isVideo ? 'video' : 'image';

    // Insert into media_assets table
    const { data: asset, error: dbErr } = await supabase
      .from('media_assets')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_path: uploadData?.path || storagePath,
        file_size: file.size,
        mime_type: mimeType,
        media_type: mediaType,
        ai_analyzed: false,
      })
      .select()
      .single();

    // Resolve public or signed URL for cross-platform distribution
    const { data: urlData } = supabase.storage.from('media-assets').getPublicUrl(storagePath);
    let previewUrl = urlData?.publicUrl || '';

    // Provide signed URL if publicUrl is not accessible or if bucket is private
    try {
      const { data: signedData } = await supabase.storage.from('media-assets').createSignedUrl(storagePath, 86400);
      if (signedData?.signedUrl) {
        previewUrl = signedData.signedUrl;
      }
    } catch {}

    return NextResponse.json({
      success: true,
      asset: {
        ...(asset || {
          id: crypto.randomUUID(),
          file_name: file.name,
          file_path: storagePath,
          file_size: file.size,
          mime_type: mimeType,
          media_type: mediaType,
        }),
        previewUrl,
      },
    });
  } catch (err: any) {
    console.error('Media upload error:', err);
    return NextResponse.json({ error: err.message || 'Media upload failed' }, { status: 500 });
  }
}
