import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const userId = user.id;

    const supabase = createAdminClient();
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'linkedin')
      .eq('status', 'active')
      .maybeSingle();

    if (!account) {
      return NextResponse.json({
        connected: false,
        profile: null,
      });
    }

    try {
      const accessToken = decryptToken(account.encrypted_access_token);
      const res = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        const userInfo = await res.json();
        return NextResponse.json({ connected: true, profile: userInfo });
      }
    } catch {
      // Fallback
    }

    return NextResponse.json({
      connected: true,
      profile: {
        id: account.external_account_id,
        name: account.account_name,
        handle: account.account_handle,
        picture: account.avatar_url,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
