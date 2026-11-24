import { NextRequest, NextResponse, after } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { postIdSchema } from '@/lib/publishing/campaign';
import { dispatchCampaign } from '@/lib/publishing/engine';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const target = postIdSchema.safeParse((await context.params).id);
  if (!target.success) return NextResponse.json({ error: 'Invalid destination' }, { status: 400 });
  try {
    const db = createAdminClient();
    const { data, error } = await db.rpc('retry_publishing_target', { owner_id: user.id, target_id: target.data });
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'This destination cannot be retried while a job is active or its outcome is unknown.' }, { status: 409 });

    const { data: targetRecord } = await db.from('post_targets').select('post_id').eq('id', target.data).maybeSingle();
    if (targetRecord?.post_id) {
      after(async () => {
        try {
          await dispatchCampaign(db, user.id, targetRecord.post_id);
        } catch (dispatchErr) {
          console.error('Async dispatchCampaign error on retry:', dispatchErr);
        }
      });
    }

    return NextResponse.json({ success: true, jobId: data }, { status: 202 });
  } catch {
    return NextResponse.json({ error: 'Could not queue the destination retry' }, { status: 503 });
  }
}
