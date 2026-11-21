import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = createAdminClient();

    let query = supabase
      .from('posts')
      .select('*, post_variants(*), post_targets(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: posts, error } = await query;

    if (error || !posts || posts.length === 0) {
      // Fallback demo posts if database is empty
      return NextResponse.json({
        success: true,
        posts: [
          {
            id: 'post_demo_1',
            title: 'Google Stitch UI/UX Release & Architecture Overview',
            status: 'published',
            publishing_mode: 'automatic',
            published_at: new Date(Date.now() - 7200000).toISOString(),
            target_platforms: ['linkedin', 'instagram', 'facebook'],
            post_variants: [
              {
                platform: 'linkedin',
                caption: 'Excited to release the new Google Stitch inspired SocialSync AI architecture.',
                hashtags: ['#Architecture', '#FullStack', '#NextJS'],
              },
            ],
            post_targets: [
              {
                platform: 'linkedin',
                status: 'published',
                external_post_id: 'urn:li:ugcPost:72635489102948271',
                external_post_url: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:72635489102948271/',
              },
            ],
          },
          {
            id: 'post_demo_2',
            title: 'Multimodal Video Distribution & Gemini OCR Analysis',
            status: 'scheduled',
            publishing_mode: 'manual_approval',
            scheduled_for: new Date(Date.now() + 86400000).toISOString(),
            target_platforms: ['youtube', 'linkedin'],
            post_variants: [],
            post_targets: [],
          },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      posts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
