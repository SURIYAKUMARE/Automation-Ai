import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, SupabaseConfigurationError } from '@/lib/supabase/admin';
import { setSessionCookie, AuthUser } from '@/lib/auth/session';

const LoginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(256) });

export async function POST(req: NextRequest) {
  const input = LoginSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
  try {
    const { data, error } = await createAdminClient().auth.signInWithPassword(input.data);
    if (error && (!error.status || error.status >= 500)) {
      return NextResponse.json({ error: 'Could not reach the sign-in service. Try again shortly.' }, { status: 503 });
    }
    if (error?.status === 429) return NextResponse.json({ error: 'Too many login attempts. Try again shortly.' }, { status: 429 });
    if (error?.code === 'email_not_confirmed') {
      return NextResponse.json({ error: 'Confirm your email using the registration message, then sign in again.' }, { status: 403 });
    }
    if (!data.user || !data.session || error) {
      return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    }
    const user: AuthUser = {
      id: data.user.id, email: data.user.email || input.data.email,
      name: data.user.user_metadata?.full_name || input.data.email.split('@')[0],
      avatarUrl: data.user.user_metadata?.avatar_url, role: 'user', createdAt: data.user.created_at,
    };
    return setSessionCookie(NextResponse.json({ success: true, user }), user);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json({ error: 'Sign-in is not configured. Set a valid Supabase project URL and server key.' }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : 'Authentication is temporarily unavailable';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
