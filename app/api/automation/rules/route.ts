import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const UpdateRuleSchema = z.object({
  userId: z.string(),
  isEnabled: z.boolean(),
  defaultMode: z.enum(['automatic', 'manual_approval']),
  defaultLanguage: z.string(),
  defaultTone: z.string(),
  enabledPlatforms: z.array(z.enum(['linkedin', 'youtube', 'instagram', 'facebook'])),
  requireReviewForVideos: z.boolean(),
  delayMinutesBeforePublish: z.number().min(0).max(1440),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'current-user';
    const supabase = createAdminClient();

    const { data: rules } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      rules: rules || {
        is_enabled: false,
        default_mode: 'manual_approval',
        default_language: 'English',
        default_tone: 'Professional',
        enabled_platforms: ['linkedin', 'instagram'],
        require_review_for_videos: true,
        delay_minutes_before_publish: 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = UpdateRuleSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid automation rules payload' }, { status: 400 });
    }

    const {
      userId,
      isEnabled,
      defaultMode,
      defaultLanguage,
      defaultTone,
      enabledPlatforms,
      requireReviewForVideos,
      delayMinutesBeforePublish,
    } = parsed.data;

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('automation_rules')
      .upsert(
        {
          user_id: userId,
          is_enabled: isEnabled,
          default_mode: defaultMode,
          default_language: defaultLanguage,
          default_tone: defaultTone,
          enabled_platforms: enabledPlatforms,
          require_review_for_videos: requireReviewForVideos,
          delay_minutes_before_publish: delayMinutesBeforePublish,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rules: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
