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
        insights: null,
      });
    }

    try {
      const accessToken = decryptToken(account.encrypted_access_token);
      const pageId = account.external_account_id;

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/insights?metric=page_impressions,page_engaged_users&period=day&access_token=${accessToken}`
      );

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ connected: true, insights: data.data || [] });
      }
    } catch {
      // Return empty if API call fails
    }

    return NextResponse.json({
      connected: true,
      insights: {
        page_impressions: 0,
        page_engaged_users: 0,
        post_reach: 0,
        synced_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
