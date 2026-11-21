import { randomBytes, timingSafeEqual } from 'node:crypto';

export function newOAuthState() {
  return randomBytes(32).toString('base64url');
}

export function matchesOAuthState(actual: string | null, expected: string | undefined) {
  return Boolean(actual && expected && /^[\w-]{43}$/.test(actual) && /^[\w-]{43}$/.test(expected) &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected)));
}

export const oauthCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 600,
};
