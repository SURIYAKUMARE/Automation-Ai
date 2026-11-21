import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

const ScheduleSchema = z.object({
  postId: z.string().uuid(),
  scheduledFor: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const json = await req.json();
    const parsed = ScheduleSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid scheduling parameters' }, { status: 400 });
    }

    const { postId, scheduledFor } = parsed.data;
    const supabase = createAdminClient();

    // Update post status to scheduled
    await supabase
      .from('posts')
      .update({
        status: 'scheduled',
        scheduled_for: scheduledFor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId);

    // Queue publishing job
    await supabase.from('publishing_jobs').insert({
      post_id: postId,
      user_id: userId,
      run_at: scheduledFor,
      status: 'queued',
      idempotency_key: `job_${postId}_${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      postId,
      scheduledFor,
      message: 'Post successfully scheduled for automatic distribution',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
