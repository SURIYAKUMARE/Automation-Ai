import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Google Drive media file explorer integration
    const files = [
      {
        id: 'drive_file_1',
        name: 'Product_Launch_Banner_4K.png',
        mimeType: 'image/png',
        size: '2.4 MB',
        thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
        modifiedTime: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'drive_file_2',
        name: 'Architecture_Explainer_Video.mp4',
        mimeType: 'video/mp4',
        size: '18.6 MB',
        thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80',
        modifiedTime: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'drive_file_3',
        name: 'SocialSync_Feature_Poster.jpg',
        mimeType: 'image/jpeg',
        size: '1.8 MB',
        thumbnailUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&auto=format&fit=crop&q=80',
        modifiedTime: new Date(Date.now() - 172800000).toISOString(),
      },
    ];

    return NextResponse.json({
      success: true,
      files,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
