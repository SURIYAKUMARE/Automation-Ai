import { NextRequest, NextResponse } from 'next/server';
import { getPlatformAdapter } from '@/integrations';
import { getSessionUser } from '@/lib/auth/session';
import { matchesOAuthState, newOAuthState, oauthCookieOptions } from '@/lib/auth/oauth-state';
import { encryptToken } from '@/lib/security/encryption';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCanonicalAppOrigin } from '@/lib/auth/canonical-origin';
import { SocialPlatform } from '@/types';

export const socialPlatforms = ['facebook', 'instagram', 'linkedin', 'youtube'] as const;

function appOrigin(req: NextRequest) {
  return getCanonicalAppOrigin(req);
}

export async function authorizeSocial(req: NextRequest, platform: SocialPlatform) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in to connect an account' }, { status: 401 });
  try {
    const state = newOAuthState();
    const redirectUri = appOrigin(req) + '/api/oauth/' + platform + '/callback';
    const response = NextResponse.redirect(getPlatformAdapter(platform).getAuthorizationUrl({
      state, redirectUri, userId: user.id,
    }));
    response.cookies.set('socialflow_oauth_' + platform, user.id + ':' + state, oauthCookieOptions);
    return response;
  } catch (err: any) {
    console.error(`OAuth authorize failed for ${platform}:`, err);
    const message = err instanceof Error ? err.message : 'Check the provider OAuth configuration.';
    const returnUrl = new URL('/dashboard/accounts', appOrigin(req));
    returnUrl.searchParams.set('error', `${platform.toUpperCase()} connection failed: ${message}`);
    return NextResponse.redirect(returnUrl);
  }
}

export async function completeSocial(req: NextRequest, platform: SocialPlatform) {
  const url = new URL('/dashboard/accounts', appOrigin(req));
  const cookie = 'socialflow_oauth_' + platform;
  const user = await getSessionUser(req);
  const [owner, expected] = (req.cookies.get(cookie)?.value || '').split(':');
  try {
    const providerError = req.nextUrl.searchParams.get('error_description') || req.nextUrl.searchParams.get('error');
    if (providerError) {
      throw new Error(`${platform.toUpperCase()} returned: ${providerError}`);
    }

    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');

    if (!code) {
      throw new Error(`No authorization code was returned from ${platform.toUpperCase()}`);
    }

    if (!user) {
      throw new Error('Your session expired. Please sign in again before connecting accounts.');
    }

    if (owner && owner !== user.id) {
      console.warn('OAuth session owner mismatch:', { owner, currentUserId: user.id });
    }

    if (!matchesOAuthState(state, expected)) {
      console.warn('OAuth state mismatch:', { state, expected });
      throw new Error('Security check: OAuth state mismatch. Please start the connection again.');
    }

    // Ensure user profile exists in profiles table
    const db = createAdminClient();
    await db.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.name || user.email.split('@')[0],
      avatar_url: user.avatarUrl || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    const redirectUri = appOrigin(req) + '/api/oauth/' + platform + '/callback';
    const token = await getPlatformAdapter(platform).exchangeCodeForToken(code, redirectUri);

    const { error } = await db.from('social_accounts').upsert({
      user_id: user.id,
      platform,
      external_account_id: token.externalAccountId,
      account_name: token.accountName,
      account_handle: token.accountHandle ?? null,
      avatar_url: token.avatarUrl ?? null,
      granted_scopes: token.grantedScopes,
      encrypted_access_token: encryptToken(token.accessToken),
      ...(token.refreshToken ? { encrypted_refresh_token: encryptToken(token.refreshToken) } : {}),
      token_expires_at: token.expiresInSeconds ? new Date(Date.now() + token.expiresInSeconds * 1000).toISOString() : null,
      status: 'active',
      metadata: token.rawMetadata ?? {},
      last_validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform,external_account_id' });

    if (error) {
      console.error('Failed to upsert social account:', error);
      throw new Error('Could not save the connected account in database: ' + error.message);
    }

    url.searchParams.set('connected', platform);
  } catch (err: any) {
    console.error(`OAuth callback failed for ${platform}:`, err);
    const message = err instanceof Error ? err.message : `Could not connect ${platform}`;
    url.searchParams.set('error', message);
  }
  const response = NextResponse.redirect(url);
  response.cookies.delete(cookie);
  return response;
}
