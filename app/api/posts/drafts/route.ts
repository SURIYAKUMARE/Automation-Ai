import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const userId = user.id;

    const supabase = createAdminClient();
    const { data: drafts } = await supabase
      .from('posts')
      .select('*, post_variants(*)')
      .eq('user_id', userId)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false });

    return NextResponse.json({
      success: true,
      drafts: drafts || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
