import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = createAdminClient();
    const signal = AbortSignal.timeout(5000);
    const [profiles, queue, library, notices, quota] = await Promise.all([
      db.from('profiles').select('id', { head: true }).limit(1).abortSignal(signal),
      db.from('publishing_jobs').select('target_id').limit(0).abortSignal(signal),
      db.from('media_assets').select('collection_name').limit(0).abortSignal(signal),
      db.from('notifications').select('id').limit(0).abortSignal(signal),
      db.from('ai_usage_windows').select('user_id').limit(0).abortSignal(signal),
    ]);
    if (profiles.error) throw profiles.error;
    const errors = [queue, library, notices, quota].flatMap((result) => result.error ? [result.error] : []);
    if (errors.some(({ code }) => ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code))) {
      return NextResponse.json({ status: 'unavailable', reason: 'workspace_schema_incomplete' }, { status: 503 });
    }
    if (errors.length) throw errors[0];
    return NextResponse.json({ status: 'healthy' });
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
}
