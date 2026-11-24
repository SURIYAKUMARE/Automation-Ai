import { NextRequest } from 'next/server';

/**
 * Resolves the canonical public origin for OAuth redirects and callbacks.
 * Handles production Vercel environments (where internal lambda sockets use http),
 * reverse proxy headers (x-forwarded-proto, x-forwarded-host), and local test runners.
 */
export function getCanonicalAppOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const isRequestLocal = forwardedHost.includes('localhost') || forwardedHost.includes('127.0.0.1');

  // 1. Explicit APP_URL or NEXT_PUBLIC_APP_URL if configured AND not localhost when accessed remotely
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured.trim().startsWith('http')) {
    try {
      const parsed = new URL(configured.trim());
      const isConfigLocal = parsed.hostname.includes('localhost') || parsed.hostname.includes('127.0.0.1');
      if (['http:', 'https:'].includes(parsed.protocol) && (!isConfigLocal || isRequestLocal)) {
        return parsed.origin;
      }
    } catch {
      // Fall through if malformed
    }
  }

  // 2. Vercel system environment variable
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercel && vercel.trim() && !isRequestLocal) {
    const host = vercel.trim().replace(/^https?:\/\//, '');
    return `https://${host}`;
  }

  // 3. Proxied request headers (Vercel, Cloudflare, AWS)
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const protocol = isRequestLocal ? (forwardedProto || req.nextUrl.protocol.replace(':', '') || 'http') : 'https';

  return `${protocol}://${forwardedHost}`;
}
