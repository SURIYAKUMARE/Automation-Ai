const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

// Emulate constant-time string comparison from route.ts
function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Emulate Webhook Verification GET logic
function handleWebhookVerification({ mode, token, challenge, expectedToken }) {
  if (!expectedToken) {
    return { status: 500, body: 'Server configuration error: Webhook verify token is not set.' };
  }
  if (!mode || !token || !challenge) {
    return { status: 403, body: 'Forbidden: Missing required verification parameters.' };
  }
  const isModeValid = mode === 'subscribe';
  const isTokenValid = timingSafeEqualStr(token, expectedToken);

  if (isModeValid && isTokenValid) {
    return { status: 200, body: challenge };
  }
  return { status: 403, body: 'Forbidden: Webhook verify token or subscription mode mismatch.' };
}

// Emulate Webhook Event Handling POST logic
function handleWebhookEvent({ rawBody, signatureHeader, appSecret, processedSet = new Set() }) {
  if (!appSecret) {
    return { status: 500, body: 'Server configuration error: App Secret not configured.' };
  }
  if (!signatureHeader) {
    return { status: 401, body: 'Unauthorized: Missing X-Hub-Signature-256 signature header.' };
  }

  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex')}`;

  if (!timingSafeEqualStr(signatureHeader, expectedSignature)) {
    return { status: 403, body: 'Forbidden: Cryptographic signature verification failed.' };
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: 'Bad Request: Malformed JSON payload.' };
  }

  const eventsProcessed = [];
  const entries = payload.entry || [];
  for (const entry of entries) {
    const entryId = entry.id || 'default_entry';
    const eventTime = entry.time || Date.now();
    if (Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        const changeField = change.field;
        const changeValueId = change.value?.id || change.value?.comment_id || `${entryId}_${eventTime}_${changeField}`;
        const eventKey = `ig_change_${entryId}_${changeField}_${changeValueId}`;

        if (processedSet.has(eventKey)) {
          continue; // Duplicate skipped
        }
        processedSet.add(eventKey);
        eventsProcessed.push(eventKey);
      }
    }
  }

  return { status: 200, body: 'EVENT_RECEIVED', processedCount: eventsProcessed.length };
}

// ==========================================
// TEST SUITE: WEBHOOK VERIFICATION (GET)
// ==========================================

test('Webhook Verification: Valid token returns HTTP 200 and exact challenge', () => {
  const expectedToken = 'my_secure_verify_token_12345';
  const challenge = '1158201444';

  const res = handleWebhookVerification({
    mode: 'subscribe',
    token: 'my_secure_verify_token_12345',
    challenge,
    expectedToken,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body, challenge);
});

test('Webhook Verification: Invalid token returns HTTP 403', () => {
  const expectedToken = 'my_secure_verify_token_12345';
  const res = handleWebhookVerification({
    mode: 'subscribe',
    token: 'wrong_unauthorized_token',
    challenge: '1158201444',
    expectedToken,
  });

  assert.strictEqual(res.status, 403);
  assert.match(res.body, /Forbidden/);
});

test('Webhook Verification: Missing token is rejected with HTTP 403', () => {
  const res = handleWebhookVerification({
    mode: 'subscribe',
    token: null,
    challenge: '1158201444',
    expectedToken: 'my_secure_verify_token_12345',
  });

  assert.strictEqual(res.status, 403);
});

test('Webhook Verification: Incorrect mode is rejected with HTTP 403', () => {
  const res = handleWebhookVerification({
    mode: 'unsubscribe',
    token: 'my_secure_verify_token_12345',
    challenge: '1158201444',
    expectedToken: 'my_secure_verify_token_12345',
  });

  assert.strictEqual(res.status, 403);
});

test('Webhook Verification: Missing challenge is rejected with HTTP 403', () => {
  const res = handleWebhookVerification({
    mode: 'subscribe',
    token: 'my_secure_verify_token_12345',
    challenge: null,
    expectedToken: 'my_secure_verify_token_12345',
  });

  assert.strictEqual(res.status, 403);
});

test('Webhook Verification: Missing server configuration returns HTTP 500 safely', () => {
  const res = handleWebhookVerification({
    mode: 'subscribe',
    token: 'my_secure_verify_token_12345',
    challenge: '1158201444',
    expectedToken: undefined,
  });

  assert.strictEqual(res.status, 500);
  assert.match(res.body, /Server configuration error/);
});

// ==========================================
// TEST SUITE: WEBHOOK EVENT HANDLING (POST)
// ==========================================

test('Webhook Event: Valid signed POST request is accepted with HTTP 200', () => {
  const appSecret = 'meta_test_secret_key_98765';
  const payload = JSON.stringify({
    object: 'instagram',
    entry: [
      {
        id: '17841400000000000',
        time: 1700000000,
        changes: [
          {
            field: 'comments',
            value: { id: 'comment_12345', text: 'Great platform!' },
          },
        ],
      },
    ],
  });

  const validSignature = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(payload, 'utf8')
    .digest('hex')}`;

  const res = handleWebhookEvent({
    rawBody: payload,
    signatureHeader: validSignature,
    appSecret,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body, 'EVENT_RECEIVED');
  assert.strictEqual(res.processedCount, 1);
});

test('Webhook Event: Invalid signature is rejected with HTTP 403', () => {
  const appSecret = 'meta_test_secret_key_98765';
  const payload = JSON.stringify({ object: 'instagram' });
  const tamperedSignature = 'sha256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const res = handleWebhookEvent({
    rawBody: payload,
    signatureHeader: tamperedSignature,
    appSecret,
  });

  assert.strictEqual(res.status, 403);
  assert.match(res.body, /signature verification failed/i);
});

test('Webhook Event: Missing signature is rejected with HTTP 401', () => {
  const appSecret = 'meta_test_secret_key_98765';
  const payload = JSON.stringify({ object: 'instagram' });

  const res = handleWebhookEvent({
    rawBody: payload,
    signatureHeader: null,
    appSecret,
  });

  assert.strictEqual(res.status, 401);
  assert.match(res.body, /Missing X-Hub-Signature-256/i);
});

test('Webhook Event: Malformed JSON payload returns HTTP 400', () => {
  const appSecret = 'meta_test_secret_key_98765';
  const malformedBody = '{ not-valid-json: ';

  const validSignature = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(malformedBody, 'utf8')
    .digest('hex')}`;

  const res = handleWebhookEvent({
    rawBody: malformedBody,
    signatureHeader: validSignature,
    appSecret,
  });

  assert.strictEqual(res.status, 400);
  assert.match(res.body, /Malformed JSON/i);
});

test('Webhook Event: Duplicate events do not cause duplicate actions (Idempotency)', () => {
  const appSecret = 'meta_test_secret_key_98765';
  const sharedSet = new Set();

  const payload = JSON.stringify({
    object: 'instagram',
    entry: [
      {
        id: '17841400000000000',
        time: 1700000000,
        changes: [
          {
            field: 'comments',
            value: { id: 'comment_dedup_999' },
          },
        ],
      },
    ],
  });

  const validSignature = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(payload, 'utf8')
    .digest('hex')}`;

  // First delivery: processes 1 event
  const firstDelivery = handleWebhookEvent({
    rawBody: payload,
    signatureHeader: validSignature,
    appSecret,
    processedSet: sharedSet,
  });
  assert.strictEqual(firstDelivery.status, 200);
  assert.strictEqual(firstDelivery.processedCount, 1);

  // Redelivery of duplicate event: idempotent, processes 0 duplicate actions
  const secondDelivery = handleWebhookEvent({
    rawBody: payload,
    signatureHeader: validSignature,
    appSecret,
    processedSet: sharedSet,
  });
  assert.strictEqual(secondDelivery.status, 200);
  assert.strictEqual(secondDelivery.processedCount, 0);
});
