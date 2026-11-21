import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const supabase = createAdminClient();
    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'instagram')
      .eq('status', 'active')
      .maybeSingle();

    if (!account) {
      return NextResponse.json({
        connected: false,
        account: null,
        message: 'No Instagram account currently connected',
        connectUrl: `/api/oauth/instagram/authorize?userId=${userId}`,
      });
    }

    return NextResponse.json({
      connected: true,
      account: {
        id: account.id,
        externalAccountId: account.external_account_id,
        accountName: account.account_name,
        accountHandle: account.account_handle,
        avatarUrl: account.avatar_url,
        grantedScopes: account.granted_scopes,
        lastValidatedAt: account.last_validated_at,
        status: account.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
