import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const userId = user.id;

    const supabase = createAdminClient();
    const { data: attempts, error } = await supabase
      .from('publishing_attempts')
      .select('*, posts!inner(title,user_id)')
      .eq('posts.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !attempts) {
      return NextResponse.json({
        success: true,
        history: [],
      });
    }

    return NextResponse.json({
      success: true,
      history: attempts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, history: [] }, { status: 500 });
  }
}
