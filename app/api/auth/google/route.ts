import { NextRequest, NextResponse } from 'next/server';
import { newOAuthState, oauthCookieOptions } from '@/lib/auth/oauth-state';
import { getGoogleOAuthConfig } from '@/lib/auth/google-config';
import { getSupabaseServerConfig } from '@/lib/supabase/admin';
import { getCanonicalAppOrigin } from '@/lib/auth/canonical-origin';
import { createSupabaseGoogleClient } from '@/lib/auth/supabase-google';
import { assertSessionConfigured, SessionConfigurationError } from '@/lib/auth/session';

function redirectToLogin(error: string, origin: string) {
  return NextResponse.redirect(new URL('/login?error=' + error, origin));
}

export async function GET(req: NextRequest) {
  const origin = getCanonicalAppOrigin(req);
  const config = getGoogleOAuthConfig();

  try {
    assertSessionConfigured();
    getSupabaseServerConfig();
  } catch (error) {
    if (error instanceof SessionConfigurationError) return redirectToLogin('session_configuration', origin);
    return redirectToLogin(config ? 'supabase_configuration' : 'google_configuration', origin);
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  if (!config) {
    const response = redirectToLogin('google_configuration', origin);
    const supabase = createSupabaseGoogleClient(req, response);
    if (!supabase) return response;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUri, queryParams: { prompt: 'select_account' }, skipBrowserRedirect: true },
    });
    if (!error && data.url) response.headers.set('Location', data.url);
    return response;
  }

  const state = newOAuthState();

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
