import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { setSessionCookie, AuthUser, stringToUuid, saveConnectedAccountToCookie } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptToken } from '@/lib/security/encryption';

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://automation-ai-dusky.vercel.app';

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
    const refreshToken = tokenData.refresh_token;

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      throw new Error('Failed to retrieve user profile from Google');
    }

    const profile = await userRes.json();
    const validUserId = stringToUuid(profile.id || profile.email || '00000000-0000-0000-0000-000000000001');

    const authUser: AuthUser = {
      id: validUserId,
      email: profile.email || 'user@gmail.com',
      name: profile.name || 'Google User',
      avatarUrl: profile.picture,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    // Connected YouTube / Google Account data
    const handleName = (profile.name || profile.email?.split('@')[0] || 'googleuser').replace(/\s+/g, '').toLowerCase();
    const connectedYouTube = {
      id: `acc-yt-${profile.id || Date.now()}`,
      platform: 'youtube',
      external_account_id: profile.id || validUserId,
      account_name: profile.name || 'YouTube Creator',
      account_handle: `@${handleName}`,
      avatar_url: profile.picture || null,
      status: 'active',
      granted_scopes: ['openid', 'email', 'profile', 'youtube.upload', 'youtube.readonly'],
      last_validated_at: new Date().toISOString(),
      expires_in_days: 365,
    };

    // Upsert into Supabase profiles & social_accounts if available
    try {
      const supabase = createAdminClient();
      await supabase.from('profiles').upsert({
        id: validUserId,
        email: authUser.email,
        full_name: authUser.name,
        avatar_url: authUser.avatarUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      await supabase.from('social_accounts').upsert({
        user_id: validUserId,
        platform: 'youtube',
        external_account_id: connectedYouTube.external_account_id,
        account_name: connectedYouTube.account_name,
        account_handle: connectedYouTube.account_handle,
        avatar_url: connectedYouTube.avatar_url,
        granted_scopes: connectedYouTube.granted_scopes,
        encrypted_access_token: encryptToken(accessToken),
        encrypted_refresh_token: refreshToken ? encryptToken(refreshToken) : null,
        status: 'active',
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform,external_account_id',
      });
    } catch (dbErr) {
      console.warn('Supabase DB persistence skipped or failed, fallback to session storage:', dbErr);
    }

    let res = NextResponse.redirect(`${baseUrl}/dashboard/accounts?connected=youtube`);
    res = setSessionCookie(res, authUser);
    res = saveConnectedAccountToCookie(req, res, connectedYouTube);
    return res;
  } catch (err: any) {
    console.error('Google callback error:', err);
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(err.message || 'Google login failed')}`);
  }
}
