import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, setSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'No active session found' }, { status: 401 });
    }

    const res = NextResponse.json({
      success: true,
      user,
      refreshedAt: new Date().toISOString(),
    });
    return setSessionCookie(res, user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
