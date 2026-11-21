import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getPostMetrics } from '@/lib/publishing/metrics';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  try {
    const posts = await getPostMetrics(user.id);
    return NextResponse.json({ success: true, posts, total: posts.length });
  } catch {
    return NextResponse.json({ error: 'Could not load post metrics' }, { status: 503 });
  }
}
