import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { executePostPublishing } from '@/lib/publishing/engine';

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Query pending jobs whose run_at is in the past or now
    const { data: jobs, error } = await supabase
      .from('publishing_jobs')
      .select('*')
      .eq('status', 'queued')
      .lte('run_at', now)
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const executedResults = [];

    for (const job of jobs || []) {
      // Mark as running
      await supabase
        .from('publishing_jobs')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', job.id);

      try {
        const summary = await executePostPublishing({
          postId: job.post_id,
          userId: job.user_id,
        });

        await supabase
          .from('publishing_jobs')
          .update({
            status: summary.successCount > 0 ? 'completed' : 'failed',
            last_error: summary.failureCount > 0 ? 'Some targets failed' : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        executedResults.push({ jobId: job.id, summary });
      } catch (jobErr: any) {
        await supabase
          .from('publishing_jobs')
          .update({
            status: 'failed',
            last_error: jobErr.message,
            retry_count: (job.retry_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        executedResults.push({ jobId: job.id, error: jobErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      processedJobsCount: executedResults.length,
      executedResults,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scheduler processing failed' }, { status: 500 });
  }
}
