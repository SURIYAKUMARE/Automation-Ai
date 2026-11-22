import { NextRequest, NextResponse } from 'next/server';
import { assertSessionConfigured, AuthUser, SessionConfigurationError, setSessionCookie, stringToUuid } from '@/lib/auth/session';
import { matchesOAuthState } from '@/lib/auth/oauth-state';
import { createAdminClient, SupabaseConfigurationError } from '@/lib/supabase/admin';
import { getGoogleOAuthConfig } from '@/lib/auth/google-config';
import { getCanonicalAppOrigin } from '@/lib/auth/canonical-origin';
import { createSupabaseGoogleClient } from '@/lib/auth/supabase-google';

export async function GET(req: NextRequest) {
  const origin = getCanonicalAppOrigin(req);
  const cookieName = 'socialflow_google_state';
  let response: NextResponse;

  try {
    assertSessionConfigured();
    // 1. Check if Google returned an error (e.g. user cancelled or unverified test user)
    const googleError = req.nextUrl.searchParams.get('error');
    if (googleError) {
      const reason = googleError === 'access_denied' ? 'google_access_denied' : 'google_sign_in_failed';
      const redirect = NextResponse.redirect(
        new URL(`/login?error=${reason}`, origin)
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

    const config = getGoogleOAuthConfig();
    if (!config && !cookieState) {
      const redirect = NextResponse.redirect(new URL('/login?error=google_sign_in_failed', origin));
      const supabase = createSupabaseGoogleClient(req, redirect);
      if (!supabase) {
        redirect.headers.set('Location', new URL('/login?error=google_configuration', origin).href);
        return redirect;
      }
      const flowId = req.nextUrl.searchParams.get('sb_flow_id');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
      const authUser = data.user;
      if (error || !authUser?.email || !authUser.email_confirmed_at) return redirect;

      const db = createAdminClient();
      const email = authUser.email.toLowerCase();
      const googleIdentity = authUser.identities?.find((identity) => identity.provider === 'google');
      if (!googleIdentity) return redirect;
      const legacyId = stringToUuid(googleIdentity.identity_data?.sub || googleIdentity.id);
      const { data: profiles, error: lookupError } = await db.from('profiles')
        .select('id,full_name,avatar_url').in('id', [authUser.id, legacyId]);
      if (lookupError) throw lookupError;
      const existing = profiles?.find((profile) => profile.id === authUser.id) || profiles?.[0];
      const user: AuthUser = {
        id: existing?.id || authUser.id,
        email,
        name: existing?.full_name || authUser.user_metadata.full_name || email.split('@')[0],
        avatarUrl: existing?.avatar_url || authUser.user_metadata.avatar_url,
        role: 'user',
        createdAt: authUser.created_at,
      };
      const { error: saveError } = await db.from('profiles').upsert({
        id: user.id, email, full_name: user.name, avatar_url: user.avatarUrl || null,
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (saveError) throw saveError;
      redirect.headers.set('Location', new URL('/dashboard', origin).href);
      return setSessionCookie(redirect, user);
    }

    if (!matchesOAuthState(state, cookieState)) {
      const redirect = NextResponse.redirect(new URL('/login?error=google_state_mismatch', origin));
      redirect.cookies.delete(cookieName);
      return redirect;
    }

    // 3. Check Google OAuth credentials
    if (!config) {
      const redirect = NextResponse.redirect(new URL('/login?error=google_configuration', origin));
      redirect.cookies.delete(cookieName);
      return redirect;
    }

    // 4. Exchange code for access token
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      signal: AbortSignal.timeout(12_000),
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
      console.warn('Google token exchange failed:', tokenResponse.status);
      throw new Error('Google token exchange failed');
    }

    const token = await tokenResponse.json();
    if (typeof token.access_token !== 'string' || !token.access_token) throw new Error('Google access token is missing');

    // 5. Retrieve user profile
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + token.access_token },
      signal: AbortSignal.timeout(12_000),
    });

    if (!profileResponse.ok) {
      console.warn('Google profile request failed:', profileResponse.status);
      throw new Error('Could not retrieve user profile from Google.');
    }

    const profile = await profileResponse.json();
    const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
    const isVerified = profile.verified_email === true || profile.email_verified === true;

    if (typeof profile.id !== 'string' || !profile.id || !email || !isVerified) {
      throw new Error('A verified email address is required from Google.');
    }

    // 6. Upsert user in profiles table strictly by Google ID
    const db = createAdminClient();
    const userId = stringToUuid(profile.id);
    const { data: existing, error: lookupError } = await db.from('profiles')
      .select('id,email,full_name,avatar_url')
      .eq('id', userId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (existing) {
      await db.from('profiles').update({
        full_name: profile.name || existing.full_name,
        avatar_url: profile.picture || existing.avatar_url,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    } else {
      const { error: insertError } = await db.from('profiles').upsert({
        id: userId,
        email: email,
        full_name: profile.name || email,
        avatar_url: profile.picture || null,
        updated_at: new Date().toISOString(),
      });
      if (insertError) {
        console.error('Could not save user profile for Google user:', insertError);
        throw new Error('Could not save user profile');
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
    const reason = error instanceof SessionConfigurationError ? 'session_configuration' :
      error instanceof SupabaseConfigurationError ? 'supabase_configuration' : 'google_sign_in_failed';
    response = NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
  }

  response.cookies.delete(cookieName);
  return response;
}
