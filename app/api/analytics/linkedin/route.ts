import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    platform: 'linkedin',
    metrics: {
      networkFollowers: 2890,
      impressions30d: 24320,
      uniqueVisitors: 6420,
      ctr: '4.6%',
      averageReactionsPerPost: 48,
      topPost: {
        id: 'li_post_top',
        title: 'Architecting Enterprise SaaS Multi-Channel Automation',
        impressions: 4890,
        reactions: 182,
        comments: 44,
      },
    },
  });
}
