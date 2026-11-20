import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const DisconnectSchema = z.object({
  accountId: z.string().uuid(),
  userId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = DisconnectSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    const { accountId, userId } = parsed.data;
    const supabase = createAdminClient();

    // Verify ownership and delete
    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log in audit logs
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'DISCONNECT_SOCIAL_ACCOUNT',
      entity_type: 'social_account',
      entity_id: accountId,
      details: { timestamp: new Date().toISOString() },
    });

    return NextResponse.json({ success: true, message: 'Account disconnected successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to disconnect account' }, { status: 500 });
  }
}
