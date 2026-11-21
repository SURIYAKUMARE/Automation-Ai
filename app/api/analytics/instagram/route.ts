import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    platform: 'instagram',
    metrics: {
      followers: 1420,
      following: 240,
      totalMedia: 42,
      impressions30d: 14200,
      reach30d: 9800,
      profileViews: 1240,
      engagementRate: '5.2%',
      topPerformingMedia: [
        {
          id: 'media_ig_1',
          caption: 'Google Stitch design architecture launch',
          likes: 245,
          comments: 32,
          reach: 2800,
        },
      ],
    },
  });
}
