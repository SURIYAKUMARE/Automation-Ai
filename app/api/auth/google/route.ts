import { NextRequest, NextResponse } from 'next/server';
import { newOAuthState, oauthCookieOptions } from '@/lib/auth/oauth-state';

export function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: 'Google sign-in is unavailable' }, { status: 503 });
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const state = newOAuthState();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: clientId, redirect_uri: new URL('/api/auth/google/callback', base).href,
    response_type: 'code', scope: 'openid email profile', state,
  }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set('socialflow_google_state', state, oauthCookieOptions);
  return response;
}
