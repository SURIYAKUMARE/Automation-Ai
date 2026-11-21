import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPlatformAdapter } from '@/integrations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '00000000-0000-0000-0000-000000000001';

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://automation-ai-dusky.vercel.app';
    const redirectUri = `${baseUrl}/api/oauth/facebook/callback`;

    const secret = process.env.TOKEN_ENCRYPTION_KEY || 'default-secret';
    const nonce = crypto.randomBytes(16).toString('hex');
    const statePayload = `${userId}:facebook:${Date.now()}:${nonce}`;
    const hmac = crypto.createHmac('sha256', secret).update(statePayload).digest('hex');
    const state = Buffer.from(`${statePayload}:${hmac}`).toString('base64url');

    const adapter = getPlatformAdapter('facebook');
    const authUrl = adapter.getAuthorizationUrl({
      userId,
      redirectUri,
      state,
    });

    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    console.error('Facebook OAuth Authorize Error:', err);
    return NextResponse.json(
      {
        error: err.message || 'Failed to initialize Facebook OAuth authorization flow',
        platform: 'facebook',
        actionRequired: 'Verify that META_APP_ID and META_APP_SECRET are configured in environment variables.',
      },
      { status: 500 }
    );
  }
}
