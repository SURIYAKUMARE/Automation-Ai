import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { manageCampaign } from '@/lib/publishing/campaign';
import { getSessionUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { data, error } = await createAdminClient().from('posts').select('id')
    .eq('user_id', user.id).eq('publishing_mode', 'automatic').eq('status', 'ready').limit(5);
  if (error) return NextResponse.json({ error: 'Could not read ready posts' }, { status: 503 });
  const results = await Promise.all(data.map(async ({ id }) => {
    const response = await manageCampaign(user.id, id, 'queue', new Date().toISOString());
    return { postId: id, queued: response.ok };
  }));
  return NextResponse.json({ success: true, processedCount: results.filter((item) => item.queued).length, results });
}
