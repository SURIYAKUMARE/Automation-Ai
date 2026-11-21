import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory LRU set to ensure idempotent event handling and prevent duplicate processing
const processedEvents = new Set<string>();
const MAX_PROCESSED_EVENTS = 2000;

function trackEventId(id: string): boolean {
  if (processedEvents.has(id)) {
    return true; // Already processed
  }
  if (processedEvents.size >= MAX_PROCESSED_EVENTS) {
    // Purge oldest entries
    const firstItem = processedEvents.values().next().value;
    if (firstItem) processedEvents.delete(firstItem);
  }
  processedEvents.add(id);
  return false;
}

/**
 * Constant-time string comparison to prevent timing attack vulnerabilities
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * PHASE 2: INSTAGRAM WEBHOOK VERIFICATION (HTTP GET)
 * Meta Developers sends a GET request to verify the Webhook Callback URL:
 *   ?hub.mode=subscribe&hub.challenge=1158201444&hub.verify_token=my_verify_token
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const expectedToken =
      process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ||
      process.env.META_WEBHOOK_VERIFY_TOKEN ||
      '3af370f33ea9676736d29980fb5aa7088ebb9fd7aeb81a1b';

    // 1. Verify that server has configured a webhook verification token
    if (!expectedToken) {
      console.error('[Instagram Webhook] Error: INSTAGRAM_WEBHOOK_VERIFY_TOKEN is not configured on the server.');
      return new Response('Server configuration error: Webhook verify token is not set.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 2. Validate hub.mode, hub.verify_token, and hub.challenge existence
    if (!mode || !token || !challenge) {
      return new Response('Forbidden: Missing required verification parameters (hub.mode, hub.verify_token, hub.challenge).', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 3. Verify mode is 'subscribe' and token matches using constant-time comparison
    const isModeValid = mode === 'subscribe';
    const isTokenValid = timingSafeEqualStr(token, expectedToken);

    if (isModeValid && isTokenValid) {
      // Return the EXACT challenge string as plain text with HTTP 200
      return new Response(challenge, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // 4. Verification token or mode mismatch
    return new Response('Forbidden: Webhook verify token or subscription mode mismatch.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: any) {
    console.error('[Instagram Webhook] GET Verification Handler Exception:', err?.message || err);
    return new Response('Internal Server Error during verification.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/**
 * PHASE 3: SECURE WEBHOOK EVENT HANDLING (HTTP POST)
 * Meta delivers subscribed Instagram events (mentions, comments, messages, etc.):
 * Header: X-Hub-Signature-256: sha256=<HMAC-SHA256 signature>
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Read raw payload text for cryptographic HMAC signature verification
    const rawBody = await req.text();

    // 2. Inspect signature header
    const signatureHeader =
      req.headers.get('x-hub-signature-256') ||
      req.headers.get('X-Hub-Signature-256');

    const appSecret =
      process.env.META_APP_SECRET ||
      process.env.INSTAGRAM_CLIENT_SECRET;

    if (!appSecret) {
      console.error('[Instagram Webhook] Error: META_APP_SECRET is not configured on the server.');
      return new Response('Server configuration error: App Secret not configured.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (!signatureHeader) {
      return new Response('Unauthorized: Missing X-Hub-Signature-256 signature header.', {
        status: 401,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 3. Compute expected HMAC-SHA256 signature
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody, 'utf8')
      .digest('hex')}`;

    if (!timingSafeEqualStr(signatureHeader, expectedSignature)) {
      return new Response('Forbidden: Cryptographic signature verification failed.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 4. Parse JSON event payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response('Bad Request: Malformed JSON payload.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 5. Verify object type
    if (payload.object !== 'instagram' && payload.object !== 'page') {
      // Acknowledge receipt even for unmonitored object types to keep Meta webhook healthy
      return new Response('EVENT_RECEIVED', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 6. Process entries with idempotency protection
    const entries = payload.entry || [];
    for (const entry of entries) {
      const entryId = entry.id || 'default_entry';
      const eventTime = entry.time || Date.now();

      // Check changes (e.g. comments, mentions, story insights)
      if (Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          const changeField = change.field;
          const changeValueId = change.value?.id || change.value?.comment_id || `${entryId}_${eventTime}_${changeField}`;
          const eventKey = `ig_change_${entryId}_${changeField}_${changeValueId}`;

          if (trackEventId(eventKey)) {
            continue; // Duplicate event skipped
          }

          // In production, offload event dispatching to background worker
          // Never log raw PII or tokens
        }
      }

      // Check messaging events
      if (Array.isArray(entry.messaging)) {
        for (const msg of entry.messaging) {
          const msgMid = msg.message?.mid || `${entryId}_${eventTime}`;
          const eventKey = `ig_msg_${entryId}_${msgMid}`;

          if (trackEventId(eventKey)) {
            continue; // Duplicate skipped
          }
        }
      }
    }

    // 7. Acknowledge receipt promptly with HTTP 200
    return new Response('EVENT_RECEIVED', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[Instagram Webhook] POST Event Handler Exception:', err?.message || err);
    return new Response('Internal Server Error processing event.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
