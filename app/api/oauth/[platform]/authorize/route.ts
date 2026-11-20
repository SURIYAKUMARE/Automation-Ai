import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPlatformAdapter } from '@/integrations';
import { SocialPlatform } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const platform = params.platform as SocialPlatform;
    if (!['linkedin', 'youtube', 'instagram', 'facebook'].includes(platform)) {
      return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'current-user';

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/oauth/${platform}/callback`;

    // Secure state token containing timestamp and HMAC signature
    const secret = process.env.TOKEN_ENCRYPTION_KEY || 'default-secret';
    const nonce = crypto.randomBytes(16).toString('hex');
    const statePayload = `${userId}:${platform}:${Date.now()}:${nonce}`;
    const hmac = crypto.createHmac('sha256', secret).update(statePayload).digest('hex');
    const state = Buffer.from(`${statePayload}:${hmac}`).toString('base64url');

    const adapter = getPlatformAdapter(platform);
    const authUrl = adapter.getAuthorizationUrl({
      userId,
      redirectUri,
      state,
    });

    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    console.error('OAuth Authorize Error:', err);
    return NextResponse.json(
      {
        error: err.message || 'Failed to initialize OAuth authorization flow',
        platform: params.platform,
        actionRequired: 'Verify that provider Client ID and Secret are configured in environment variables.',
      },
      { status: 500 }
    );
  }
}
