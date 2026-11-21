import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { error } = await createAdminClient().from('profiles').select('id', { head: true }).limit(1)
      .abortSignal(AbortSignal.timeout(3000));
    if (error) throw error;
    return NextResponse.json({ status: 'healthy' });
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
}
