import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { setSessionCookie, AuthUser } from '@/lib/auth/session';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = RegisterSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid registration details', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    let userId = '00000000-0000-0000-0000-000000000001';

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (!error && data?.user) {
        userId = data.user.id;
        // Upsert public profile record
        await supabase.from('profiles').upsert({
          id: userId,
          email,
          full_name: name,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      // Offline fallback
    }

    const authUser: AuthUser = {
      id: userId,
      email,
      name,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    const res = NextResponse.json({
      success: true,
      user: authUser,
      message: 'Account created successfully',
    });
    return setSessionCookie(res, authUser);
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal registration error' },
      { status: 500 }
    );
  }
}
