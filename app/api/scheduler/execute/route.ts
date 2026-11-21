import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { executePostPublishing } from '@/lib/publishing/engine';

export async function POST(req: NextRequest) {
  try {
    // Check Cron authorization
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Fetch overdue scheduled jobs
    const { data: overdueJobs } = await supabase
      .from('publishing_jobs')
      .select('id, post_id, user_id')
      .eq('status', 'queued')
      .lte('run_at', nowIso)
      .limit(10);

    const results: any[] = [];
    if (overdueJobs && overdueJobs.length > 0) {
      for (const job of overdueJobs) {
        // Mark job as running
        await supabase
          .from('publishing_jobs')
          .update({ status: 'running', updated_at: new Date().toISOString() })
          .eq('id', job.id);

        const publishRes = await executePostPublishing({ postId: job.post_id, userId: job.user_id });
        const isSuccess = publishRes.failureCount === 0;

        // Mark job as completed or failed
        await supabase
          .from('publishing_jobs')
          .update({
            status: isSuccess ? 'completed' : 'failed',
            last_error: isSuccess ? null : 'Publishing execution failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.push({ jobId: job.id, postId: job.post_id, publishRes });
      }
    }

    return NextResponse.json({
      success: true,
      executedCount: results.length,
      jobs: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Support GET for Vercel Cron invocation
export async function GET(req: NextRequest) {
  return POST(req);
}
