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
  } catch {
    return NextResponse.json({ error: 'Check the provider OAuth configuration.' }, { status: 503 });
  }
}

export async function completeSocial(req: NextRequest, platform: SocialPlatform) {
  const url = new URL('/dashboard/accounts', appOrigin(req));
  const cookie = 'socialflow_oauth_' + platform;
  const user = await getSessionUser(req);
  const [owner, expected] = (req.cookies.get(cookie)?.value || '').split(':');
  try {
    const code = req.nextUrl.searchParams.get('code');
    if (!user || owner !== user.id || !matchesOAuthState(req.nextUrl.searchParams.get('state'), expected) || !code) {
      throw new Error('Invalid OAuth callback');
    }
    const redirectUri = appOrigin(req) + '/api/oauth/' + platform + '/callback';
    const token = await getPlatformAdapter(platform).exchangeCodeForToken(code, redirectUri);
    const db = createAdminClient();
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
    if (error) throw new Error('Could not save the connected account');
    url.searchParams.set('connected', platform);
  } catch {
    url.searchParams.set('error', 'Could not connect ' + platform + '. Check eligibility, permissions, and provider configuration.');
  }
  const response = NextResponse.redirect(url);
  response.cookies.delete(cookie);
  return response;
}
