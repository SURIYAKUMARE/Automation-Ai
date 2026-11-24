import { NextRequest, NextResponse } from 'next/server';
import { getPlatformAdapter } from '@/integrations';
import { getSessionUser } from '@/lib/auth/session';
import { matchesOAuthState, newOAuthState, oauthCookieOptions } from '@/lib/auth/oauth-state';
import { encryptToken } from '@/lib/security/encryption';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCanonicalAppOrigin } from '@/lib/auth/canonical-origin';
import { getYouTubeOAuthConfig } from '@/lib/auth/google-config';
import { SocialPlatform } from '@/types';

export const socialPlatforms = ['facebook', 'instagram', 'linkedin', 'youtube'] as const;

const credentials: Record<SocialPlatform, readonly (string | undefined)[]> = {
  get facebook() { return [process.env.META_APP_ID, process.env.META_APP_SECRET]; },
  get instagram() { return [process.env.META_APP_ID, process.env.META_APP_SECRET]; },
  get linkedin() { return [process.env.LINKEDIN_CLIENT_ID, process.env.LINKEDIN_CLIENT_SECRET]; },
  get youtube() { const config = getYouTubeOAuthConfig(); return [config?.clientId, config?.clientSecret]; },
};

function providerConfigured(platform: SocialPlatform) {
  if (platform === 'facebook' || platform === 'instagram') {
    const appId = process.env.META_APP_ID || '1105730908969288';
    return Boolean(appId && appId.trim().length > 3 && !/^(?:placeholder|example)$/i.test(appId));
  }
  return credentials[platform].every((value) => value?.trim() && !/(?:placeholder|your[-_]|mock[-_]|example)/i.test(value));
}

function appOrigin(req: NextRequest) {
  return getCanonicalAppOrigin(req);
}

export async function authorizeSocial(req: NextRequest, platform: SocialPlatform) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in to connect an account' }, { status: 401 });
  const returnUrl = new URL('/dashboard/accounts', appOrigin(req));
  if (!providerConfigured(platform)) {
    returnUrl.searchParams.set('error', 'The workspace administrator needs to configure ' + platform + ' OAuth.');
    return NextResponse.redirect(returnUrl);
  }
  try {
    const state = newOAuthState();
    const redirectUri = appOrigin(req) + '/api/oauth/' + platform + '/callback';
    const response = NextResponse.redirect(getPlatformAdapter(platform).getAuthorizationUrl({
      state, redirectUri, userId: user.id,
    }));
    response.cookies.set('socialflow_oauth_' + platform, user.id + ':' + state, oauthCookieOptions);
    return response;
  } catch {
    returnUrl.searchParams.set('error', 'Could not start the connection. Ask the workspace administrator to check the provider settings.');
    return NextResponse.redirect(returnUrl);
  }
}

export async function completeSocial(req: NextRequest, platform: SocialPlatform) {
  const url = new URL('/dashboard/accounts', appOrigin(req));
  const cookie = 'socialflow_oauth_' + platform;
  const user = await getSessionUser(req);
  const [owner, expected] = (req.cookies.get(cookie)?.value || '').split(':');
  let message = 'Could not connect ' + platform + '. Check the account eligibility and permissions, then try again.';
  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    if (!user || owner !== user.id || !matchesOAuthState(state, expected)) {
      message = 'This connection request no longer matches your session. Start again from Social accounts.';
      throw new Error('Invalid connection request');
    }
    if (req.nextUrl.searchParams.has('error') || !code) {
      message = 'The provider did not authorize this connection. Check the requested permissions and try again.';
      throw new Error('Unsuccessful provider consent');
    }

    const redirectUri = appOrigin(req) + '/api/oauth/' + platform + '/callback';
    const token = await getPlatformAdapter(platform).exchangeCodeForToken(code, redirectUri);

    message = 'Could not save the connected account. Please try again.';
    const db = createAdminClient();
    const { error: profileError } = await db.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.name || user.email.split('@')[0],
      avatar_url: user.avatarUrl || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id', ignoreDuplicates: true });
    if (profileError) throw profileError;

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

    if (error) throw error;

    url.searchParams.set('connected', platform);
  } catch {
    url.searchParams.set('error', message);
  }
  const response = NextResponse.redirect(url);
  response.cookies.delete(cookie);
  return response;
}
