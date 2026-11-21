import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const supabase = createAdminClient();
    const { data: jobs } = await supabase
      .from('publishing_jobs')
      .select('*, posts(title, target_platforms)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    return NextResponse.json({
      success: true,
      history: jobs || [
        {
          id: 'job_sample_1',
          status: 'completed',
          run_at: new Date(Date.now() - 7200000).toISOString(),
          retry_count: 0,
          posts: { title: 'SocialSync AI Milestone Launch', target_platforms: ['linkedin', 'instagram'] },
        },
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
