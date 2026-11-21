import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const supabase = createAdminClient();

    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('id, platform, external_account_id, account_name, account_handle, avatar_url, granted_scopes, token_expires_at, status, last_validated_at')
      .eq('user_id', user?.id || '00000000-0000-0000-0000-000000000001');

    if (error || !accounts) {
      return NextResponse.json({
        success: true,
        accounts: [],
        total: 0,
      });
    }

    return NextResponse.json({
      success: true,
      accounts: accounts.filter((a: any) => a.status === 'active'),
      total: accounts.filter((a: any) => a.status === 'active').length,
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

    const supabase = createAdminClient();
    let query = supabase.from('social_accounts').delete();

    if (accountId) {
      query = query.eq('id', accountId);
    } else if (platform) {
      query = query.eq('platform', platform).eq('user_id', user?.id || '00000000-0000-0000-0000-000000000001');
    } else {
      return NextResponse.json(
        { success: false, error: 'accountId or platform is required' },
        { status: 400 }
      );
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Account disconnected successfully`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}
