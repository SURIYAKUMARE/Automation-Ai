import { NextRequest, NextResponse } from 'next/server';
import { AuthUser, setSessionCookie, stringToUuid } from '@/lib/auth/session';
import { matchesOAuthState } from '@/lib/auth/oauth-state';
import { createAdminClient, SupabaseConfigurationError } from '@/lib/supabase/admin';
import { getGoogleOAuthConfig } from '@/lib/auth/google-config';

export async function GET(req: NextRequest) {
  const configured = URL.parse(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin);
  const base = configured && ['http:', 'https:'].includes(configured.protocol) ? configured.origin : req.nextUrl.origin;
  const cookie = 'socialflow_google_state';
  let response: NextResponse;
  try {
    const code = req.nextUrl.searchParams.get('code');
    if (!code || !matchesOAuthState(req.nextUrl.searchParams.get('state'), req.cookies.get(cookie)?.value)) {
      throw new Error('Invalid Google sign-in state');
    }
    const config = getGoogleOAuthConfig();
    if (!config) {
      const redirect = NextResponse.redirect(new URL('/login?error=google_configuration', base));
      redirect.cookies.delete(cookie);
      return redirect;
    }
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        code, client_id: config.clientId, client_secret: config.clientSecret, grant_type: 'authorization_code',
        redirect_uri: new URL('/api/auth/google/callback', base).href,
      }),
    });
    if (!tokenResponse.ok) throw new Error('Google token exchange failed');
    const token = await tokenResponse.json();
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + token.access_token },
    });
    if (!profileResponse.ok) throw new Error('Google profile unavailable');
    const profile = await profileResponse.json();
    if (!profile.id || !profile.email || !profile.verified_email) throw new Error('Verified Google email required');
    const user: AuthUser = {
      id: stringToUuid(profile.id), email: profile.email, name: profile.name || profile.email,
      avatarUrl: profile.picture, role: 'user', createdAt: new Date().toISOString(),
    };
    const { error } = await createAdminClient().from('profiles').upsert({
      id: user.id, email: user.email, full_name: user.name, avatar_url: user.avatarUrl,
    });
    if (error) throw new Error('Could not save Google profile');
    response = setSessionCookie(NextResponse.redirect(new URL('/dashboard', base)), user);
  } catch (error) {
    const reason = error instanceof SupabaseConfigurationError ? 'supabase_configuration' : 'google_sign_in_failed';
    response = NextResponse.redirect(new URL('/login?error=' + reason, base));
  }
  response.cookies.delete(cookie);
  return response;
}
