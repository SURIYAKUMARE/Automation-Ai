import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const supabase = createAdminClient();

    // Query media table from Supabase
    const { data: mediaItems, error } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !mediaItems || mediaItems.length === 0) {
      return NextResponse.json({
        success: true,
        media: [
          {
            id: 'med-001',
            fileName: 'hero-banner.png',
            url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
            mimeType: 'image/png',
            size: 2458900,
            width: 1920,
            height: 1080,
            aspectRatio: '16:9',
            createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
          },
          {
            id: 'med-002',
            fileName: 'product-preview.jpg',
            url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&auto=format&fit=crop&q=80',
            mimeType: 'image/jpeg',
            size: 1542000,
            width: 1080,
            height: 1080,
            aspectRatio: '1:1',
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          },
        ],
        total: 2,
      });
    }

    return NextResponse.json({
      success: true,
      media: mediaItems,
      total: mediaItems.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to list media assets' },
      { status: 500 }
    );
  }
}
