import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { manageCampaign, postIdSchema } from '@/lib/publishing/campaign';
import { createAdminClient } from '@/lib/supabase/admin';
import { executePostPublishing, ClaimedJob } from '@/lib/publishing/engine';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const input = postIdSchema.safeParse((await req.json().catch(() => null))?.postId);
  if (!input.success) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  const res = await manageCampaign(user.id, input.data, 'queue', new Date().toISOString());
  if (res.ok) {
    try {
      const db = createAdminClient();
      const { data: jobs } = await db.rpc('claim_publishing_job');
      const job = jobs?.[0] as ClaimedJob | undefined;
      if (job) await executePostPublishing(db, job);
    } catch (e) {
      console.warn('Immediate queue publishing dispatch notice:', e);
    }
  }
  return res;
}
