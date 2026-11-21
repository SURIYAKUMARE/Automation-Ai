const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

// Inline encryption logic for standalone Node test runner
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function encryptToken(plaintext, hexKey) {
  const key = Buffer.from(hexKey, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decryptToken(payload, hexKey) {
  const parts = payload.split(':');
  if (parts.length !== 3) throw new Error('Invalid format');
  const [ivHex, tagHex, encryptedHex] = parts;
  const key = Buffer.from(hexKey, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

test('AES-256-GCM Token Encryption & Decryption', async (t) => {
  const mockKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const sampleToken = 'oauth2_access_token_secret_123456789!@#$%';

  const encrypted = encryptToken(sampleToken, mockKey);
  assert.ok(encrypted.includes(':'));
  assert.notStrictEqual(encrypted, sampleToken);

  const decrypted = decryptToken(encrypted, mockKey);
  assert.strictEqual(decrypted, sampleToken);
});

test('AES-256-GCM Rejects Tampered Ciphertext', async (t) => {
  const mockKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const sampleToken = 'token_secret';
  const encrypted = encryptToken(sampleToken, mockKey);

  const parts = encrypted.split(':');
  const ciphertext = Buffer.from(parts[2], 'hex');
  ciphertext[ciphertext.length - 1] ^= 1;
  const tampered = `${parts[0]}:${parts[1]}:${ciphertext.toString('hex')}`;

  assert.throws(() => {
    decryptToken(tampered, mockKey);
  });
});
