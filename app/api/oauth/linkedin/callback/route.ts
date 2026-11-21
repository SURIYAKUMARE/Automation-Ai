import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPlatformAdapter } from '@/integrations';
import { encryptToken } from '@/lib/security/encryption';
import { createAdminClient } from '@/lib/supabase/admin';
import { stringToUuid, saveConnectedAccountToCookie } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://automation-ai-dusky.vercel.app';

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error') || searchParams.get('error_description');

    if (oauthError) {
      console.error('OAuth provider error for linkedin:', oauthError);
      return NextResponse.redirect(`${baseUrl}/dashboard/accounts?error=${encodeURIComponent(oauthError)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=${encodeURIComponent('Missing authorization code or state token')}`
      );
    }

    const decodedState = Buffer.from(state, 'base64url').toString('utf8');
    const parts = decodedState.split(':');
    if (parts.length !== 5) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=${encodeURIComponent('Invalid state token structure')}`
      );
    }

    const [userId, statePlatform, timestampStr, nonce, receivedHmac] = parts;
    const secret = process.env.TOKEN_ENCRYPTION_KEY || 'default-secret';
    const statePayload = `${userId}:${statePlatform}:${timestampStr}:${nonce}`;
    const expectedHmac = crypto.createHmac('sha256', secret).update(statePayload).digest('hex');

    if (receivedHmac !== expectedHmac || statePlatform !== 'linkedin') {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=${encodeURIComponent('State token verification failed')}`
      );
    }

    if (Date.now() - parseInt(timestampStr, 10) > 15 * 60 * 1000) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=${encodeURIComponent('OAuth state token expired. Please retry.')}`
      );
    }

    const redirectUri = `${baseUrl}/api/oauth/linkedin/callback`;
    const adapter = getPlatformAdapter('linkedin');
    const tokenResult = await adapter.exchangeCodeForToken(code, redirectUri);

    const encryptedAccess = encryptToken(tokenResult.accessToken);
    const encryptedRefresh = tokenResult.refreshToken ? encryptToken(tokenResult.refreshToken) : null;

    const expiresAt = tokenResult.expiresInSeconds && tokenResult.expiresInSeconds > 0
      ? new Date(Date.now() + tokenResult.expiresInSeconds * 1000).toISOString()
      : null;

    const validUserId = stringToUuid(userId);

    const connectedAccount = {
      id: `acc-li-${tokenResult.externalAccountId || Date.now()}`,
      platform: 'linkedin',
      external_account_id: tokenResult.externalAccountId,
      account_name: tokenResult.accountName,
      account_handle: tokenResult.accountHandle || `@${tokenResult.accountName.replace(/\s+/g, '').toLowerCase()}`,
      avatar_url: tokenResult.avatarUrl || null,
      status: 'active',
      granted_scopes: tokenResult.grantedScopes,
      last_validated_at: new Date().toISOString(),
      expires_in_days: 60,
    };

    // Attempt Supabase persistence
    try {
      const supabase = createAdminClient();
      await supabase.from('profiles').upsert({
        id: validUserId,
        email: 'user@linkedin.com',
        full_name: tokenResult.accountName || 'LinkedIn User',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      await supabase.from('social_accounts').upsert(
        {
          user_id: validUserId,
          platform: 'linkedin',
          external_account_id: tokenResult.externalAccountId,
          account_name: tokenResult.accountName,
          account_handle: tokenResult.accountHandle || null,
          avatar_url: tokenResult.avatarUrl || null,
          granted_scopes: tokenResult.grantedScopes,
          encrypted_access_token: encryptedAccess,
          encrypted_refresh_token: encryptedRefresh,
          token_expires_at: expiresAt,
          status: 'active',
          metadata: tokenResult.rawMetadata || {},
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform,external_account_id',
        }
      );
    } catch (dbErr) {
      console.warn('Supabase DB persistence error for LinkedIn, using secure cookie fallback:', dbErr);
    }

    let res = NextResponse.redirect(`${baseUrl}/dashboard/accounts?connected=linkedin`);
    res = saveConnectedAccountToCookie(req, res, connectedAccount);
    return res;
  } catch (err: any) {
    console.error('OAuth Callback Error for linkedin:', err);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=${encodeURIComponent(err.message || 'LinkedIn OAuth exchange failed')}`
    );
  }
}
