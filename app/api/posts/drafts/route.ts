import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

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
