import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPlatformAdapter } from '@/integrations';
import { encryptToken } from '@/lib/security/encryption';
import { createAdminClient } from '@/lib/supabase/admin';
import { SocialPlatform } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const platform = params.platform as SocialPlatform;

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error') || searchParams.get('error_description');

    if (oauthError) {
      console.error(`OAuth provider error for ${platform}:`, oauthError);
      return NextResponse.redirect(`${baseUrl}/dashboard/accounts?error=${encodeURIComponent(oauthError)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=${encodeURIComponent('Missing authorization code or state token')}`
      );
    }

    // Validate state token HMAC
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

    if (receivedHmac !== expectedHmac || statePlatform !== platform) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=${encodeURIComponent('State token verification failed')}`
      );
    }

    // Check expiration (max 15 minutes)
    if (Date.now() - parseInt(timestampStr, 10) > 15 * 60 * 1000) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=${encodeURIComponent('OAuth state token expired. Please retry.')}`
      );
    }

    const redirectUri = `${baseUrl}/api/oauth/${platform}/callback`;
    const adapter = getPlatformAdapter(platform);
    const tokenResult = await adapter.exchangeCodeForToken(code, redirectUri);

    // Encrypt sensitive tokens with AES-256-GCM before saving to database
    const encryptedAccess = encryptToken(tokenResult.accessToken);
    const encryptedRefresh = tokenResult.refreshToken ? encryptToken(tokenResult.refreshToken) : null;

    const expiresAt = tokenResult.expiresInSeconds && tokenResult.expiresInSeconds > 0
      ? new Date(Date.now() + tokenResult.expiresInSeconds * 1000).toISOString()
      : null;

    const supabase = createAdminClient();

    // Upsert social account record
    const { error: upsertErr } = await supabase.from('social_accounts').upsert(
      {
        user_id: userId,
        platform,
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

    if (upsertErr) {
      console.error('Failed to persist social account:', upsertErr);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=${encodeURIComponent(upsertErr.message)}`
      );
    }

    // Create success notification
    await supabase.from('notifications').insert({
      user_id: userId,
      title: `${platform.toUpperCase()} Account Connected`,
      message: `Successfully connected ${tokenResult.accountName}. Ready for automated publishing.`,
      type: 'success',
      link: '/dashboard/accounts',
    });

    return NextResponse.redirect(`${baseUrl}/dashboard/accounts?connected=${platform}`);
  } catch (err: any) {
    console.error(`OAuth Callback Error for ${platform}:`, err);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=${encodeURIComponent(err.message || 'OAuth exchange failed')}`
    );
  }
}
