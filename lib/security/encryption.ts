import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function parseKey(value: string | undefined): Buffer | null {
  const key = value?.trim();
  if (!key || !/^[a-f0-9]{64}$/i.test(key) || key.toLowerCase() === '0123456789abcdef'.repeat(4)) return null;
  return Buffer.from(key, 'hex');
}

function getEncryptionKey(): Buffer {
  const key = parseKey(process.env.TOKEN_ENCRYPTION_KEY);
  if (!key) throw new Error('A private token encryption key of 64 hexadecimal characters is required');
  return key;
}

/**
 * Encrypts a plaintext string (e.g. OAuth token) using AES-256-GCM.
 * Formats output as: iv:tag:ciphertext (hex-encoded)
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a token encrypted with AES-256-GCM.
 */
export function decryptToken(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  if (!/^[a-f0-9]{32}:[a-f0-9]{32}:(?:[a-f0-9]{2})+$/i.test(encryptedPayload)) {
    throw new Error('Invalid encrypted token payload format');
  }
  const [iv, tag, encrypted] = encryptedPayload.split(':').map((value) => Buffer.from(value, 'hex'));
  const current = getEncryptionKey();
  const previous = parseKey(process.env.TOKEN_ENCRYPTION_PREVIOUS_KEY);
  for (const key of previous && !previous.equals(current) ? [current, previous] : [current]) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch {
      // A private previous key can read connections created before a planned rotation.
    }
  }

  throw new Error('Invalid or corrupted encrypted token');
}
