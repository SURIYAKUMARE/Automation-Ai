import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { setSessionCookie, AuthUser } from '@/lib/auth/session';

const LoginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(6).max(256) });

export async function POST(req: NextRequest) {
  const input = LoginSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
  try {
    const { data, error } = await createAdminClient().auth.signInWithPassword(input.data);
    if (error && (!error.status || error.status >= 500)) return NextResponse.json({ error: 'Authentication is temporarily unavailable' }, { status: 503 });
    if (error?.status === 429) return NextResponse.json({ error: 'Too many login attempts' }, { status: 429 });
    if (!data.user || !data.session || error) {
      return NextResponse.json({ error: 'Invalid credentials or unconfirmed email' }, { status: 401 });
    }
    const user: AuthUser = {
      id: data.user.id, email: data.user.email || input.data.email,
      name: data.user.user_metadata?.full_name || input.data.email.split('@')[0],
      avatarUrl: data.user.user_metadata?.avatar_url, role: 'user', createdAt: data.user.created_at,
    };
    return setSessionCookie(NextResponse.json({ success: true, user }), user);
  } catch {
    return NextResponse.json({ error: 'Authentication is temporarily unavailable' }, { status: 503 });
  }
}
