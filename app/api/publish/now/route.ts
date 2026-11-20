import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { executePostPublishing } from '@/lib/publishing/engine';

const PublishNowSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = PublishNowSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid publish request' }, { status: 400 });
    }

    const { postId, userId } = parsed.data;
    const summary = await executePostPublishing({ postId, userId });

    return NextResponse.json({
      success: summary.successCount > 0,
      summary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Publishing execution failed' }, { status: 500 });
  }
}
