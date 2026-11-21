import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getPostMetrics } from '@/lib/publishing/metrics';

function csv(value: string | number | null) {
  let text = String(value ?? '');
  if (/^\s*[=+\-@\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  try {
    const posts = await getPostMetrics(user.id);
    const keys = ['reach', 'impressions', 'views', 'likes', 'comments', 'shares'] as const;
    const rows = posts.map((post) => [post.title, post.platform, post.status, post.publishedAt, post.syncedAt,
      ...keys.map((key) => post.metrics[key])].map(csv).join(','));
    return new NextResponse(['Post,Platform,Status,Published at,Synced at,' + keys.join(','), ...rows].join('\r\n'), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="socialflow-analytics.csv"' },
    });
  } catch {
    return NextResponse.json({ error: 'Could not export metrics' }, { status: 503 });
  }
}
