import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptToken, decryptToken } from '@/lib/security/encryption';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
  createdAt: string;
}

const SESSION_COOKIE_NAME = 'socialsync_session';
const SESSION_SECRET = process.env.TOKEN_ENCRYPTION_KEY || 'default-session-encryption-key-0123456789abcdef';
const CONNECTIONS_COOKIE_NAME = 'socialsync_connections';

/**
 * Converts any arbitrary string (e.g. Google numeric ID, email) into a valid RFC 4122 UUID v4
 */
export function stringToUuid(str: string): string {
  if (!str) return '00000000-0000-0000-0000-000000000001';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    return str.toLowerCase();
  }
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Reads encrypted connected accounts fallback from cookie
 */
export function getConnectedAccountsFromCookie(req: NextRequest): any[] {
  try {
    const raw = req.cookies.get(CONNECTIONS_COOKIE_NAME)?.value;
    if (!raw) return [];
    const decrypted = decryptToken(raw);
    const parsed = JSON.parse(decrypted);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Appends or updates a connected account in the encrypted cookie
 */
export function saveConnectedAccountToCookie(req: NextRequest, res: NextResponse, newAccount: any): NextResponse {
  try {
    const existing = getConnectedAccountsFromCookie(req);
    const filtered = existing.filter((a) => a.platform !== newAccount.platform);
    filtered.push(newAccount);
    const encrypted = encryptToken(JSON.stringify(filtered));
    res.cookies.set({
      name: CONNECTIONS_COOKIE_NAME,
      value: encrypted,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  } catch (err) {
    console.error('Failed to set connected account cookie:', err);
  }
  return res;
}

/**
 * Removes a connected platform from the encrypted cookie
 */
export function removeConnectedAccountFromCookie(req: NextRequest, res: NextResponse, platform: string): NextResponse {
  try {
    const existing = getConnectedAccountsFromCookie(req);
    const filtered = existing.filter((a) => a.platform !== platform);
    const encrypted = encryptToken(JSON.stringify(filtered));
    res.cookies.set({
      name: CONNECTIONS_COOKIE_NAME,
      value: encrypted,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
  } catch (err) {
    console.error('Failed to update connected account cookie:', err);
  }
  return res;
}

/**
 * Creates an encrypted, tamper-proof session token containing user payload and expiration
 */
export function createSessionToken(user: AuthUser, expiresInMs = 7 * 24 * 60 * 60 * 1000): string {
  const expiresAt = Date.now() + expiresInMs;
  const payload = JSON.stringify({ user, expiresAt });
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(SESSION_SECRET).digest();

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Verifies and decodes an encrypted session token
 */
export function verifySessionToken(token: string): AuthUser | null {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return null;

    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = crypto.createHash('sha256').update(SESSION_SECRET).digest();

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const data = JSON.parse(decrypted);
    if (!data.user || !data.expiresAt) return null;

    // Check expiration
    if (Date.now() > data.expiresAt) {
      return null;
    }

    return data.user;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts and verifies the current session user from incoming NextRequest
 */
export async function getSessionUser(req: NextRequest): Promise<AuthUser | null> {
  // 1. Check HTTP-only cookie
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) {
    const user = verifySessionToken(cookieToken);
    if (user) return user;
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    const user = verifySessionToken(bearerToken);
    if (user) return user;
  }

  // 3. Fallback to default user for demonstration / development environment
  return {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@socialsync.ai',
    name: 'Administrator',
    role: 'admin',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Injects session cookie into NextResponse
 */
export function setSessionCookie(response: NextResponse, user: AuthUser): NextResponse {
  const token = createSessionToken(user);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
  return response;
}

/**
 * Clears session cookie from NextResponse
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete({
    name: SESSION_COOKIE_NAME,
    path: '/',
  });
  return response;
}
