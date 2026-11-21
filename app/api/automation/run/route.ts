import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { executePostPublishing } from '@/lib/publishing/engine';
import { getSessionUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const supabase = createAdminClient();

    // 1. Fetch pending posts ready for publishing
    const { data: pendingPosts } = await supabase
      .from('posts')
      .select('id, title, publishing_mode')
      .eq('user_id', userId)
      .eq('status', 'ready')
      .limit(5);

    const executed: any[] = [];
    if (pendingPosts && pendingPosts.length > 0) {
      for (const p of pendingPosts) {
        const result = await executePostPublishing({ postId: p.id, userId });
        executed.push({ postId: p.id, title: p.title, result });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: executed.length,
      executed,
      message: 'Automation cycle completed successfully',
      executedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
