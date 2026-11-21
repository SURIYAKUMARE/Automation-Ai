import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    platform: 'facebook',
    metrics: {
      pageLikes: 3410,
      pageFollowers: 3890,
      pageImpressions30d: 18400,
      postEngagements30d: 2150,
      engagementRate: '3.8%',
      topPost: {
        id: 'fb_post_top',
        message: 'Intelligent multi-platform automation release notes',
        reactions: 142,
        comments: 28,
        shares: 19,
      },
    },
  });
}
