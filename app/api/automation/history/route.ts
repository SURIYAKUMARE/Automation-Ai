import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const userId = user.id;

    const supabase = createAdminClient();
    const { data: jobs } = await supabase
      .from('publishing_jobs')
      .select('*, posts(title, target_platforms)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    return NextResponse.json({
      success: true,
      history: jobs || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
