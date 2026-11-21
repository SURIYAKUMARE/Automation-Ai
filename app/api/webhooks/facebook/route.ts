import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Facebook Webhook Verification (HTTP GET)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const expectedToken =
      process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ||
      process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ||
      process.env.META_WEBHOOK_VERIFY_TOKEN ||
      '3af370f33ea9676736d29980fb5aa7088ebb9fd7aeb81a1b';

    if (!expectedToken) {
      return new Response('Server configuration error: Webhook verify token not configured.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (!mode || !token || !challenge) {
      return new Response('Forbidden: Missing parameters.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (mode === 'subscribe' && timingSafeEqualStr(token, expectedToken)) {
      return new Response(challenge, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    return new Response('Forbidden: Verify token mismatch.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: any) {
    return new Response('Internal error', { status: 500 });
  }
}

/**
 * Facebook Webhook Event Handling (HTTP POST)
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-hub-signature-256');
    const appSecret = process.env.META_APP_SECRET;

    if (!appSecret) {
      return new Response('Server configuration error', { status: 500 });
    }

    if (!signatureHeader) {
      return new Response('Unauthorized: Missing signature', { status: 401 });
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody, 'utf8')
      .digest('hex')}`;

    if (!timingSafeEqualStr(signatureHeader, expectedSignature)) {
      return new Response('Forbidden: Invalid signature', { status: 403 });
    }

    return new Response('EVENT_RECEIVED', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return new Response('Internal error', { status: 500 });
  }
}
