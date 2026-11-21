import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getSessionUser, setSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const res = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
    return clearSessionCookie(res);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
