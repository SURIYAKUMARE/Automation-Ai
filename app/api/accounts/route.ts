import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionUser,
  stringToUuid,
  getConnectedAccountsFromCookie,
  removeConnectedAccountFromCookie,
} from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const validUserId = stringToUuid(user?.id || '00000000-0000-0000-0000-000000000001');

    // 1. Check Supabase
    let dbAccounts: any[] = [];
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('social_accounts')
        .select('id, platform, external_account_id, account_name, account_handle, avatar_url, granted_scopes, token_expires_at, status, last_validated_at')
        .eq('user_id', validUserId);

      if (!error && data) {
        dbAccounts = data.filter((a: any) => a.status === 'active');
      }
    } catch (e) {
      console.warn('Supabase accounts fetch skipped/failed, relying on secure cookie store:', e);
    }

    // 2. Check encrypted cookie fallback
    const cookieAccounts = getConnectedAccountsFromCookie(req);

    // Merge: start with cookie accounts, override with DB accounts if present
    const map = new Map<string, any>();
    for (const ca of cookieAccounts) {
      if (ca.status === 'active') {
        map.set(ca.platform, ca);
      }
    }
    for (const da of dbAccounts) {
      map.set(da.platform, {
        id: da.id,
        platform: da.platform,
        account_name: da.account_name,
        account_handle: da.account_handle,
        avatar_url: da.avatar_url,
        status: da.status,
        granted_scopes: da.granted_scopes,
        last_validated_at: da.last_validated_at,
        expires_in_days: 60,
      });
    }

    const accounts = Array.from(map.values()).map((a: any) => ({
      id: a.id,
      platform: a.platform,
      account_name: a.account_name,
      account_handle: a.account_handle,
      avatar_url: a.avatar_url,
      status: a.status,
      granted_scopes: a.granted_scopes,
      last_validated_at: a.last_validated_at,
      expires_in_days: a.expires_in_days || 60,
    }));

    return NextResponse.json({
      success: true,
      accounts,
      total: accounts.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch accounts', accounts: [], total: 0 },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const body = await req.json();
    const { accountId, platform } = body;
    const validUserId = stringToUuid(user?.id || '00000000-0000-0000-0000-000000000001');

    // 1. Delete from Supabase
    try {
      const supabase = createAdminClient();
      let query = supabase.from('social_accounts').delete();

      if (accountId) {
        query = query.eq('id', accountId);
      } else if (platform) {
        query = query.eq('platform', platform).eq('user_id', validUserId);
      }
      await query;
    } catch (e) {
      console.warn('Supabase delete skipped or failed:', e);
    }

    // 2. Clear from cookie
    let res: NextResponse = NextResponse.json({
      success: true,
      message: `Account disconnected successfully`,
    });

    if (platform) {
      res = removeConnectedAccountFromCookie(req, res, platform);
    }

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}
