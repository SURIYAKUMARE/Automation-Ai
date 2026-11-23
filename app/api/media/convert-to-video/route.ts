import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { generateVideoFromImageWithFFmpeg } from '@/lib/publishing/media-inspection';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const duration = Math.min(60, Math.max(5, Number(formData.get('duration')) || 30));

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Please upload an image file to convert' }, { status: 400 });
    }

    const imageBytes = Buffer.from(await file.arrayBuffer());
    const { videoBuffer, duration: probedDuration, width, height } = await generateVideoFromImageWithFFmpeg(
      imageBytes,
      duration
    );

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-youtube-30s.mp4`;

    return new NextResponse(new Uint8Array(videoBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'X-Video-Duration': String(probedDuration),
        'X-Video-Width': String(width),
        'X-Video-Height': String(height),
      },
    });
  } catch (error) {
    console.error('FFmpeg video conversion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not convert image with FFmpeg' },
      { status: 500 }
    );
  }
}
