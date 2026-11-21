import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, SupabaseConfigurationError } from '@/lib/supabase/admin';
import { setSessionCookie, AuthUser } from '@/lib/auth/session';

const RegisterSchema = z.object({
  email: z.string().email().max(254), password: z.string().min(6).max(256), name: z.string().trim().min(2).max(100),
});

export async function POST(req: NextRequest) {
  const input = RegisterSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Invalid registration details' }, { status: 400 });
  try {
    const { email, password, name } = input.data;
    const { data, error } = await createAdminClient().auth.signUp({
      email, password, options: { data: { full_name: name } },
    });
    if (error && (!error.status || error.status >= 500)) return NextResponse.json({ error: 'Registration is temporarily unavailable' }, { status: 503 });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || 'Could not register' }, { status: error?.status === 429 ? 429 : 400 });
    }
    if (!data.session) return NextResponse.json({ success: true, confirmationRequired: true });
    const user: AuthUser = { id: data.user.id, email, name, role: 'user', createdAt: data.user.created_at };
    return setSessionCookie(NextResponse.json({ success: true, user }), user);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json({ error: 'Registration is not configured. Set a valid Supabase project URL and server key.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Registration is temporarily unavailable' }, { status: 503 });
  }
}
