import { NextRequest, NextResponse } from 'next/server';
import { newOAuthState, oauthCookieOptions } from '@/lib/auth/oauth-state';
import { getGoogleOAuthConfig } from '@/lib/auth/google-config';
import { getSupabaseServerConfig } from '@/lib/supabase/admin';

function redirectToLogin(error: string) {
  return new NextResponse(null, { status: 307, headers: { Location: '/login?error=' + error } });
}

export function GET(req: NextRequest) {
  const config = getGoogleOAuthConfig();
  const base = URL.parse(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin);
  if (!config || !base || !['http:', 'https:'].includes(base.protocol)) {
    return redirectToLogin('google_configuration');
  }
  try {
    getSupabaseServerConfig();
  } catch {
    return redirectToLogin('supabase_configuration');
  }
  const requestHost = req.headers.get('host') || req.nextUrl.host;
  if (base.host !== requestHost || base.protocol !== req.nextUrl.protocol) {
    return NextResponse.redirect(new URL('/api/auth/google', base));
  }
  const state = newOAuthState();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: config.clientId, redirect_uri: new URL('/api/auth/google/callback', base).href,
    response_type: 'code', scope: 'openid email profile', state,
  }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set('socialflow_google_state', state, oauthCookieOptions);
  return response;
}
