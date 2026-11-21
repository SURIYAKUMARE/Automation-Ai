import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function authorizeAI(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return { response: NextResponse.json({ error: 'Sign in required' }, { status: 401 }) };
  try {
    const db = createAdminClient();
    const [limit, brand] = await Promise.all([
      db.rpc('consume_ai_request', { owner_id: user.id }),
      db.from('brand_profiles').select('voice,audience,keywords').eq('user_id', user.id).maybeSingle(),
    ]);
    if (limit.error || brand.error) throw new Error('AI configuration is unavailable');
    if (!limit.data) return { response: NextResponse.json({ error: 'Hourly AI request limit reached' }, { status: 429 }) };
    return { user, brand: brand.data };
  } catch {
    return { response: NextResponse.json({ error: 'AI service is temporarily unavailable' }, { status: 503 }) };
  }
}
