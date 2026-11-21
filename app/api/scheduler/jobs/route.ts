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
      .select('*, posts(title, scheduled_for, target_platforms)')
      .eq('user_id', userId)
      .in('status', ['queued', 'running'])
      .order('run_at', { ascending: true });

    return NextResponse.json({
      success: true,
      jobs: jobs || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
