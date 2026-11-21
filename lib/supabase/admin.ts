import { createClient } from '@supabase/supabase-js';

export class SupabaseConfigurationError extends Error {}

export function getSupabaseServerConfig() {
  const rawUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  const url = rawUrl ? URL.parse(rawUrl) : null;
  const loopback = url && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!key || !url || (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) ||
      /^(?:your-project|mock-supabase|placeholder|example)(?:[.-]|$)/i.test(url.hostname) ||
      /(?:your[-_]|mock[-_]|placeholder)/i.test(key)) {
    throw new SupabaseConfigurationError('A real Supabase project URL and server key are required.');
  }
  return { url: url.href, key };
}

export function createAdminClient() {
  const { url, key } = getSupabaseServerConfig();
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
