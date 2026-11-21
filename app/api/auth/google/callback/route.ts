import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { setSessionCookie, AuthUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Missing authorization code or state')}`);
    }

    // Verify state
    const decodedState = Buffer.from(state, 'base64url').toString('utf8');
    const parts = decodedState.split(':');
    if (parts.length !== 4) {
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Invalid state token')}`);
    }

    const [prefix, timestampStr, nonce, receivedHmac] = parts;
    const secret = process.env.TOKEN_ENCRYPTION_KEY || 'default-secret';
    const statePayload = `${prefix}:${timestampStr}:${nonce}`;
    const expectedHmac = crypto.createHmac('sha256', secret).update(statePayload).digest('hex');

    if (receivedHmac !== expectedHmac) {
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('State verification failed')}`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // Exchange code for token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Google token exchange failed: ${tokenRes.status} - ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      throw new Error('Failed to retrieve user profile from Google');
    }

    const profile = await userRes.json();

    const authUser: AuthUser = {
      id: profile.id || '00000000-0000-0000-0000-000000000001',
      email: profile.email || 'user@gmail.com',
      name: profile.name || 'Google User',
      avatarUrl: profile.picture,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    // Upsert into Supabase profiles if possible
    try {
      const supabase = createAdminClient();
      await supabase.from('profiles').upsert({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.name,
        avatar_url: authUser.avatarUrl,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Offline fallback
    }

    const res = NextResponse.redirect(`${baseUrl}/dashboard`);
    return setSessionCookie(res, authUser);
  } catch (err: any) {
    console.error('Google callback error:', err);
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(err.message || 'Google login failed')}`);
  }
}
