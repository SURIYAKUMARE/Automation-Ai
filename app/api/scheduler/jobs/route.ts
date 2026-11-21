import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const userId = user.id;

    const supabase = createAdminClient();
    const { data: jobs, error } = await supabase
      .from('publishing_jobs')
      .select('*, posts(title, scheduled_for, target_platforms)')
      .eq('user_id', userId)
      .in('status', ['queued', 'running'])
      .order('run_at', { ascending: true }).limit(100);

    if (error) return NextResponse.json({ error: 'Could not load the publishing queue' }, { status: 503 });
    return NextResponse.json({
      success: true,
      jobs: jobs || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
