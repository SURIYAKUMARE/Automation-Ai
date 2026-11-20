const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

function generateState(userId, platform, secret) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `${userId}:${platform}:${timestamp}:${nonce}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

function verifyState(stateToken, expectedPlatform, secret) {
  const decoded = Buffer.from(stateToken, 'base64url').toString('utf8');
  const parts = decoded.split(':');
  if (parts.length !== 5) return false;
  const [userId, platform, timestamp, nonce, receivedHmac] = parts;
  if (platform !== expectedPlatform) return false;

  const payload = `${userId}:${platform}:${timestamp}:${nonce}`;
  const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return receivedHmac === expectedHmac;
}

test('OAuth State Token HMAC Validation', async (t) => {
  const secret = 'super-secret-key-for-test';
  const token = generateState('user-123', 'linkedin', secret);

  const isValid = verifyState(token, 'linkedin', secret);
  assert.strictEqual(isValid, true);

  const isInvalidPlatform = verifyState(token, 'youtube', secret);
  assert.strictEqual(isInvalidPlatform, false);

  const isInvalidSecret = verifyState(token, 'linkedin', 'wrong-secret');
  assert.strictEqual(isInvalidSecret, false);
});
