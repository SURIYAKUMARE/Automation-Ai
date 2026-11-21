import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId parameter' }, { status: 400 });
    }

    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const userId = user.id;

    const supabase = createAdminClient();
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'facebook')
      .eq('status', 'active')
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ comments: [] });
    }

    try {
      const accessToken = decryptToken(account.encrypted_access_token);
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${postId}/comments?fields=id,message,created_time,from,like_count&access_token=${accessToken}`
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ comments: data.data || [] });
      }
    } catch {
      // Return empty if API error
    }

    return NextResponse.json({
      comments: [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
