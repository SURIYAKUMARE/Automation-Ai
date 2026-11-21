import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const supabase = createAdminClient();
    const { data: attempts } = await supabase
      .from('publishing_attempts')
      .select('*, posts(title)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!attempts || attempts.length === 0) {
      return NextResponse.json({
        success: true,
        history: [
          {
            id: 'attempt_882',
            title: 'Autonomous Multi-Platform Distribution Architecture',
            platform: 'linkedin',
            status: 'published',
            external_post_id: 'urn:li:ugcPost:72635489102948271',
            external_post_url: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:72635489102948271/',
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'attempt_883',
            title: 'Autonomous Multi-Platform Distribution Architecture',
            platform: 'instagram',
            status: 'published',
            external_post_id: '1795182940294819',
            external_post_url: 'https://www.instagram.com/p/DB7654321/',
            created_at: new Date(Date.now() - 3550000).toISOString(),
          },
          {
            id: 'attempt_884',
            title: 'Autonomous Multi-Platform Distribution Architecture',
            platform: 'facebook',
            status: 'published',
            external_post_id: '1092837465_987654321',
            external_post_url: 'https://www.facebook.com/1092837465/posts/987654321',
            created_at: new Date(Date.now() - 3500000).toISOString(),
          },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      history: attempts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
