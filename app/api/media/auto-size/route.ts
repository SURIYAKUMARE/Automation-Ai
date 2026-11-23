import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { autoSizeImage } from '@/lib/publishing/media-inspection';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const targetFormat = formData.get('format') === 'png' ? 'png' : 'jpeg';
    const targetRatio = (formData.get('ratio') as 'auto' | '1:1' | '4:5' | '1.91:1') || 'auto';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Please provide an image file to auto-size' }, { status: 400 });
    }

    const imageBytes = Buffer.from(await file.arrayBuffer());
    const { buffer, mime, width, height, format } = await autoSizeImage(
      imageBytes,
      targetFormat,
      targetRatio
    );

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-autosize.${format === 'png' ? 'png' : 'jpg'}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'X-Image-Width': String(width),
        'X-Image-Height': String(height),
      },
    });
  } catch (error) {
    console.error('Image auto-sizing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not auto-size image' },
      { status: 500 }
    );
  }
}
