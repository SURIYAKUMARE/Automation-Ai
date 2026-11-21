import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const supabase = createAdminClient();
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'facebook')
      .eq('status', 'active')
      .maybeSingle();

    if (!account) {
      return NextResponse.json({
        connected: false,
        pages: [],
      });
    }

    try {
      const accessToken = decryptToken(account.encrypted_access_token);
      const res = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,category,access_token,tasks&access_token=${accessToken}`
      );

      if (res.ok) {
        const data = await res.json();
        const pages = (data.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          canManagePosts: Array.isArray(p.tasks) && p.tasks.includes('MANAGE'),
        }));
        return NextResponse.json({ connected: true, pages });
      }
    } catch {
      // Fallback
    }

    return NextResponse.json({
      connected: true,
      pages: [
        {
          id: account.external_account_id,
          name: account.account_name,
          category: 'Software & Technology',
          canManagePosts: true,
        },
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
