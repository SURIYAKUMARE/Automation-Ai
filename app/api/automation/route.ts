import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const userId = user.id;

    const supabase = createAdminClient();
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!rule) {
      return NextResponse.json({
        success: true,
        rules: {
          is_enabled: true,
          default_mode: 'manual_approval',
          default_language: 'English',
          default_tone: 'Professional',
          enabled_platforms: ['linkedin', 'instagram', 'facebook', 'youtube'],
          require_review_for_videos: true,
          delay_minutes_before_publish: 0,
        },
      });
    }

    return NextResponse.json({ success: true, rules: rule });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const userId = user.id;

    const json = await req.json();
    const supabase = createAdminClient();

    const { data: updated, error } = await supabase
      .from('automation_rules')
      .upsert({
        user_id: userId,
        ...json,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, rules: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
