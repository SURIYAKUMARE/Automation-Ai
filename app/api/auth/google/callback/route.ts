import { NextRequest, NextResponse } from 'next/server';
import { AuthUser, setSessionCookie, stringToUuid } from '@/lib/auth/session';
import { matchesOAuthState } from '@/lib/auth/oauth-state';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const cookie = 'socialflow_google_state';
  let response: NextResponse;
  try {
    const code = req.nextUrl.searchParams.get('code');
    if (!code || !matchesOAuthState(req.nextUrl.searchParams.get('state'), req.cookies.get(cookie)?.value)) {
      throw new Error('Invalid Google sign-in state');
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('Missing Google configuration');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code',
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
  } catch {
    response = NextResponse.redirect(new URL('/login?error=Google%20sign-in%20failed', base));
  }
  response.cookies.delete(cookie);
  return response;
}
