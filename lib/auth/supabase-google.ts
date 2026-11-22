import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { oauthCookieOptions } from '@/lib/auth/oauth-state';
import { getSupabaseServerConfig } from '@/lib/supabase/admin';

const cookiePrefix = 'socialflow_google_pkce';

export function createSupabaseGoogleClient(req: NextRequest, response: NextResponse) {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key || /your[-_]|mock[-_]|placeholder/.test(key)) return null;
  const { url } = getSupabaseServerConfig();
  return createServerClient(url, key, {
    cookieOptions: { name: cookiePrefix, ...oauthCookieOptions },
    cookies: {
      getAll: () => req.cookies.getAll().filter(({ name }) => name.startsWith(cookiePrefix + '-')),
      setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => {
        // Only persist the OAuth verifier. SocialFlow issues its own session after sign-in.
        for (const { name, value, options } of cookies) {
          if (name.startsWith(cookiePrefix + '-')) response.cookies.set(name, value, options);
        }
      },
    },
  });
}
