import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { platformSchema, postIdSchema } from '@/lib/publishing/campaign';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  try {
    const { data, error } = await createAdminClient().from('social_accounts')
      .select('id,platform,external_account_id,account_name,account_handle,avatar_url,granted_scopes,token_expires_at,status,last_validated_at')
      .eq('user_id', user.id).neq('status', 'revoked').order('created_at');
    if (error) throw error;
    const accounts = data.map((account) => ({
      ...account,
      expires_in_days: account.token_expires_at ? Math.max(0, Math.ceil((Date.parse(account.token_expires_at) - Date.now()) / 86_400_000)) : null,
    }));
    return NextResponse.json({ success: true, accounts, total: accounts.length });
  } catch {
    return NextResponse.json({ error: 'Could not load connected accounts' }, { status: 503 });
  }
}

const Disconnect = z.object({ accountId: postIdSchema.optional(), platform: platformSchema.optional() })
  .refine((body) => Boolean(body.accountId || body.platform));

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const input = Disconnect.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Choose an account to disconnect' }, { status: 400 });
  try {
    let query = createAdminClient().from('social_accounts').update({
      status: 'revoked', encrypted_access_token: '', encrypted_refresh_token: null, updated_at: new Date().toISOString(),
    }).eq('user_id', user.id).neq('status', 'revoked');
    if (input.data.accountId) query = query.eq('id', input.data.accountId);
    if (input.data.platform) query = query.eq('platform', input.data.platform);
    const { data, error } = await query.select('id');
    if (error) throw error;
    if (!data.length) return NextResponse.json({ error: 'Connected account unavailable' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Could not disconnect the account' }, { status: 503 });
  }
}
