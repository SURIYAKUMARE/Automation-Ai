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
      .eq('platform', 'instagram')
      .eq('status', 'active')
      .maybeSingle();

    if (!account) {
      return NextResponse.json({
        connected: false,
        metrics: null,
      });
    }

    try {
      const accessToken = decryptToken(account.encrypted_access_token);
      const igId = account.external_account_id;

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${igId}/insights?metric=impressions,reach,profile_views&period=day&access_token=${accessToken}`
      );

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          connected: true,
          metrics: data.data || [],
        });
      }
    } catch {
      // Return empty if API call fails
    }

    return NextResponse.json({
      connected: true,
      metrics: {
        impressions: 0,
        reach: 0,
        profile_views: 0,
        followers_growth: '0%',
        synced_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
