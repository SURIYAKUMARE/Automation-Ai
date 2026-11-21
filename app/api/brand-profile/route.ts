import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

const Brand = z.object({
  voice: z.string().trim().max(500), audience: z.string().trim().max(500), keywords: z.string().trim().max(500),
});

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { data, error } = await createAdminClient().from('brand_profiles')
    .select('voice,audience,keywords').eq('user_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load brand preferences' }, { status: 503 });
  return NextResponse.json({ brand: data ?? { voice: '', audience: '', keywords: '' } });
}
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const input = Brand.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Brand fields must each be 500 characters or fewer' }, { status: 400 });
  const { error } = await createAdminClient().from('brand_profiles').upsert({
    ...input.data, user_id: user.id, updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: 'Could not save brand preferences' }, { status: 503 });
  return NextResponse.json({ brand: input.data });
}
