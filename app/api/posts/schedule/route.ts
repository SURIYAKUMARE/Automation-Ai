import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { manageCampaign, postIdSchema } from '@/lib/publishing/campaign';

const Schedule = z.object({ postId: postIdSchema, scheduledFor: z.string().datetime({ offset: true }) });

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const input = Schedule.safeParse(await req.json().catch(() => null));
  if (!input.success || Date.parse(input.data.scheduledFor) <= Date.now()) {
    return NextResponse.json({ error: 'Choose a future date and time' }, { status: 400 });
  }
  return manageCampaign(user.id, input.data.postId, 'queue', input.data.scheduledFor);
}
