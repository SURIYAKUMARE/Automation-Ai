import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

const Settings = z.object({
  enabled: z.boolean(), acknowledged: z.boolean().default(false),
  accountIds: z.array(z.string().uuid()).max(20).default([]),
  language: z.enum(['English', 'Tamil', 'Tanglish']).default('English'),
  youtubePrivacy: z.enum(['private', 'unlisted', 'public']).default('private'),
}).refine((settings) => !settings.enabled || (settings.acknowledged &&
  settings.accountIds.length > 0 && new Set(settings.accountIds).size === settings.accountIds.length));

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  try {
    const db = createAdminClient();
    const [settings, accounts] = await Promise.all([
      db.from('upload_automation').select('enabled,account_ids,language,youtube_privacy').eq('user_id', user.id).maybeSingle(),
      db.from('social_accounts').select('id,platform,account_name').eq('user_id', user.id).eq('status', 'active').order('created_at'),
    ]);
    if (settings.error || accounts.error) throw new Error('Could not read automation settings');
    return NextResponse.json({ settings: settings.data, accounts: accounts.data });
  } catch {
    return NextResponse.json({ error: 'Could not load upload publishing settings' }, { status: 503 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const input = Settings.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Select destinations and explicitly authorize upload publishing' }, { status: 400 });
  const { enabled, accountIds, language, youtubePrivacy } = input.data;
  try {
    const db = createAdminClient();
    if (enabled) {
      const { data, error } = await db.from('social_accounts').select('id').eq('user_id', user.id)
        .eq('status', 'active').in('id', accountIds);
      if (error) throw error;
      if (data.length !== accountIds.length) return NextResponse.json({ error: 'Choose active accounts belonging to you' }, { status: 409 });
    }
    const { data, error } = await db.from('upload_automation').upsert({
      user_id: user.id, enabled, account_ids: enabled ? accountIds : [], revision: randomUUID(),
      language, youtube_privacy: youtubePrivacy, updated_at: new Date().toISOString(),
    }).select('enabled,account_ids,language,youtube_privacy').single();
    if (error) throw error;
    return NextResponse.json({ settings: data });
  } catch {
    return NextResponse.json({ error: 'Could not save upload publishing settings' }, { status: 503 });
  }
}
