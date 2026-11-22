import { NextRequest, NextResponse } from 'next/server';
import { newOAuthState, oauthCookieOptions } from '@/lib/auth/oauth-state';
import { getGoogleOAuthConfig } from '@/lib/auth/google-config';
import { getSupabaseServerConfig } from '@/lib/supabase/admin';
import { getCanonicalAppOrigin } from '@/lib/auth/canonical-origin';

function redirectToLogin(error: string, origin: string) {
  return NextResponse.redirect(new URL('/login?error=' + error, origin));
}

export function GET(req: NextRequest) {
  const origin = getCanonicalAppOrigin(req);
  const config = getGoogleOAuthConfig();

  if (!config) {
    return redirectToLogin('google_configuration', origin);
  }

  try {
    getSupabaseServerConfig();
  } catch {
    return redirectToLogin('supabase_configuration', origin);
  }

  const state = newOAuthState();
  const redirectUri = `${origin}/api/auth/google/callback`;

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  }).toString();

  const response = NextResponse.redirect(url);
  response.cookies.set('socialflow_google_state', state, oauthCookieOptions);
  return response;
}
