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
      .eq('platform', 'linkedin')
      .eq('status', 'active')
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ organizations: [] });
    }

    try {
      const accessToken = decryptToken(account.encrypted_access_token);
      const res = await fetch(
        'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ organizations: data.elements || [] });
      }
    } catch {
      // Return empty if API call fails
    }

    return NextResponse.json({
      organizations: [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
