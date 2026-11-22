import { NextRequest, NextResponse } from 'next/server';
import { AuthUser, setSessionCookie, stringToUuid } from '@/lib/auth/session';
import { matchesOAuthState } from '@/lib/auth/oauth-state';
import { createAdminClient, SupabaseConfigurationError } from '@/lib/supabase/admin';
import { getGoogleOAuthConfig } from '@/lib/auth/google-config';
import { getCanonicalAppOrigin } from '@/lib/auth/canonical-origin';

export async function GET(req: NextRequest) {
  const origin = getCanonicalAppOrigin(req);
  const cookieName = 'socialflow_google_state';
  let response: NextResponse;

  try {
    // 1. Check if Google returned an error (e.g. user cancelled or unverified test user)
    const googleError = req.nextUrl.searchParams.get('error');
    if (googleError) {
      const errorDesc = req.nextUrl.searchParams.get('error_description') || '';
      console.warn('Google OAuth returned error:', googleError, errorDesc);
      const reason = googleError === 'access_denied' ? 'google_access_denied' : 'google_sign_in_failed';
      const redirect = NextResponse.redirect(
        new URL(`/login?error=${reason}&details=${encodeURIComponent(errorDesc || googleError)}`, origin)
      );
      redirect.cookies.delete(cookieName);
      return redirect;
    }

    // 2. Validate authorization code and state token
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const cookieState = req.cookies.get(cookieName)?.value;

    if (!code) {
      throw new Error('Google authorization code was not returned.');
    }

    if (!matchesOAuthState(state, cookieState)) {
      console.warn('Google OAuth state mismatch:', { state, cookieState });
      const redirect = NextResponse.redirect(new URL('/login?error=google_state_mismatch', origin));
      redirect.cookies.delete(cookieName);
      return redirect;
    }

    // 3. Check Google OAuth credentials
    const config = getGoogleOAuthConfig();
    if (!config) {
      const redirect = NextResponse.redirect(new URL('/login?error=google_configuration', origin));
      redirect.cookies.delete(cookieName);
      return redirect;
    }

    // 4. Exchange code for access token
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Google token exchange error:', tokenResponse.status, errText);
      let errMsg = 'Google token exchange failed';
      try {
        const json = JSON.parse(errText);
        errMsg = json.error_description || json.error || errMsg;
      } catch {}
      const redirect = NextResponse.redirect(
        new URL(`/login?error=google_sign_in_failed&details=${encodeURIComponent(errMsg)}`, origin)
      );
      redirect.cookies.delete(cookieName);
      return redirect;
    }

    const token = await tokenResponse.json();

    // 5. Retrieve user profile
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + token.access_token },
    });

    if (!profileResponse.ok) {
      const pErr = await profileResponse.text();
      console.error('Google profile request failed:', profileResponse.status, pErr);
      throw new Error('Could not retrieve user profile from Google.');
    }

    const profile = await profileResponse.json();
    const email = profile.email;
    const isVerified = profile.verified_email === true || profile.email_verified === true || Boolean(email);

    if (!profile.id || !email || !isVerified) {
      throw new Error('A verified email address is required from Google.');
    }

    // 6. Upsert user in profiles table (preserve existing profile if already registered with same email)
    const db = createAdminClient();
    const existing = await db.from('profiles').select('id,email,full_name,avatar_url').eq('email', email).maybeSingle();

    let userId: string;
    if (existing.data?.id) {
      userId = existing.data.id;
      await db.from('profiles').update({
        full_name: profile.name || existing.data.full_name,
        avatar_url: profile.picture || existing.data.avatar_url,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    } else {
      userId = stringToUuid(profile.id);
      const { error: insertError } = await db.from('profiles').upsert({
        id: userId,
        email: email,
        full_name: profile.name || email,
        avatar_url: profile.picture || null,
        updated_at: new Date().toISOString(),
      });
      if (insertError) {
        console.error('Could not save user profile for Google user:', insertError);
        throw new Error('Could not save user profile: ' + insertError.message);
      }
    }

    const user: AuthUser = {
      id: userId,
      email: email,
      name: profile.name || email.split('@')[0],
      avatarUrl: profile.picture || undefined,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    response = setSessionCookie(NextResponse.redirect(new URL('/dashboard', origin)), user);
  } catch (error) {
    console.error('Google callback caught error:', error);
    const reason = error instanceof SupabaseConfigurationError ? 'supabase_configuration' : 'google_sign_in_failed';
    const detail = error instanceof Error ? error.message : 'Google sign-in could not be completed.';
    response = NextResponse.redirect(new URL(`/login?error=${reason}&details=${encodeURIComponent(detail)}`, origin));
  }

  response.cookies.delete(cookieName);
  return response;
}
