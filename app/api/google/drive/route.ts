import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
export async function GET(req: NextRequest) {
  if (!(await getSessionUser(req))) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  return NextResponse.json({ error: 'Google Drive is unavailable. Use the uploads in the post studio.' }, { status: 501 });
}
