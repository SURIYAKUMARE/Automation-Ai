import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const hexKey = process.env.TOKEN_ENCRYPTION_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SESSION_SECRET;
  if (!hexKey || hexKey.length < 32) throw new Error('Token encryption key is missing or too short');
  if (!/^[a-f\d]{64}$/i.test(hexKey)) {
    // If not a 64-char hex string (32 bytes), hash it to produce 32 bytes
    return crypto.createHash('sha256').update(hexKey).digest();
  }
  return Buffer.from(hexKey, 'hex');
}

function getAllEncryptionKeys(): Buffer[] {
  const candidates = [
    process.env.TOKEN_ENCRYPTION_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
    process.env.SESSION_SECRET,
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    '66fcab6f-86e5-4ad7-b550-b2f11b12de3c',
    '3soI+iAFIoVTdHYuXHqPf72hOZtO0uVfHEH9I0HP82oxZAZ9p2IOoNv/7T55+xK+QanW5fr4hWK9wdKEmAA0eA==',
  ].filter((c): c is string => typeof c === 'string' && c.trim().length >= 16);

  const keys: Buffer[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    if (/^[a-f\d]{64}$/i.test(c)) {
      const hexBuf = Buffer.from(c, 'hex');
      const hexStr = hexBuf.toString('hex');
      if (!seen.has(hexStr)) {
        seen.add(hexStr);
        keys.push(hexBuf);
      }
    }
    const hashBuf = crypto.createHash('sha256').update(c).digest();
    const hashStr = hashBuf.toString('hex');
    if (!seen.has(hashStr)) {
      seen.add(hashStr);
      keys.push(hashBuf);
    }
  }
  return keys;
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
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token payload format');
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const keys = getAllEncryptionKeys();
  let lastError: any = null;

  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Invalid or corrupted encrypted token');
}
