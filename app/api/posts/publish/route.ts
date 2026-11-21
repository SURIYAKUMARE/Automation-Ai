import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { executePostPublishing } from '@/lib/publishing/engine';
import { getSessionUser } from '@/lib/auth/session';

const PublishPostSchema = z.object({
  postId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const json = await req.json();
    const parsed = PublishPostSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid postId' }, { status: 400 });
    }

    const { postId } = parsed.data;
    const result = await executePostPublishing({ postId, userId });

    return NextResponse.json({
      success: result.failureCount === 0,
      postId: result.postId,
      totalTargets: result.totalTargets,
      successCount: result.successCount,
      failureCount: result.failureCount,
      results: result.results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
