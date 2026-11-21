import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { ClaimedJob, executePostPublishing } from '@/lib/publishing/engine';
import { reconcileYouTubeProcessing } from '@/lib/publishing/youtube-processing';

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ error: 'Worker configuration is missing' }, { status: 503 });
  }
  const expected = Buffer.from('Bearer ' + secret);
  const received = Buffer.from(req.headers.get('authorization') || '');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: 'Unauthorized worker request' }, { status: 401 });
  }
  try {
    const db = createAdminClient();
    const { data, error } = await db.rpc('claim_publishing_job');
    if (error) throw error;
    const job = data?.[0] as ClaimedJob | undefined;
    const jobs = job ? [await executePostPublishing(db, job)] : [];
    const reviewed = await reconcileYouTubeProcessing(db);
    return NextResponse.json({ success: true, executedCount: jobs.length, jobs, reviewed: reviewed.filter(Boolean).length });
  } catch {
    return NextResponse.json({ error: 'Worker could not finish. In-flight outcomes are retained for reconciliation.' }, { status: 503 });
  }
}

export async function GET(req: NextRequest) { return POST(req); }
