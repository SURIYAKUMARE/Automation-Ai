import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { data, error } = await createAdminClient().from('profiles')
    .select('email,full_name,organization,timezone').eq('id', user.id).single();
  if (error) return NextResponse.json({ error: 'Could not load profile' }, { status: 503 });
  return NextResponse.json({ profile: data });
}

const Profile = z.object({
  full_name: z.string().trim().min(1).max(100),
  organization: z.string().trim().max(200),
  timezone: z.string().max(100).refine((value) => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
  }),
});
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const input = Profile.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Enter a valid profile name and timezone' }, { status: 400 });
  const { error } = await createAdminClient().from('profiles').update({
    ...input.data, updated_at: new Date().toISOString(),
  }).eq('id', user.id);
  if (error) return NextResponse.json({ error: 'Could not save profile' }, { status: 503 });
  return NextResponse.json({ success: true });
}
