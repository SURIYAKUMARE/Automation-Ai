import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getPostMetrics } from '@/lib/publishing/metrics';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  try {
    const posts = (await getPostMetrics(user.id)).filter((post) => post.platform === 'facebook');
    return NextResponse.json({ success: true, platform: 'facebook', posts });
  } catch {
    return NextResponse.json({ error: 'Provider metrics unavailable' }, { status: 503 });
  }
}
