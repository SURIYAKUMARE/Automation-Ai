import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getSessionUser } from '@/lib/auth/session';

const popular = unstable_cache(async (region: string) => {
  const key = process.env.YOUTUBE_TRENDS_API_KEY;
  if (!key) return null;
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.search = new URLSearchParams({ part: 'snippet', chart: 'mostPopular', regionCode: region, maxResults: '25' }).toString();
  const response = await fetch(url, { headers: { 'X-Goog-Api-Key': key }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('YouTube chart unavailable');
  const json = await response.json();
  const items = (json.items as { id: string; snippet: { title: string; tags?: string[] } }[]).map((item, index) => ({
    id: item.id, title: item.snippet.title, tags: item.snippet.tags ?? [], chartPosition: index + 1,
  }));
  return { source: 'YouTube Data API mostPopular chart', checkedAt: new Date().toISOString(), items };
}, ['socialflow-youtube-chart'], { revalidate: 3600 });

export async function GET(req: NextRequest) {
  if (!(await getSessionUser(req))) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { searchParams } = req.nextUrl;
  const region = (searchParams.get('region') ?? 'IN').toUpperCase();
  const query = (searchParams.get('query') ?? '').slice(0, 120);
  if (!/^[A-Z]{2}$/.test(region)) return NextResponse.json({ error: 'Use a two-letter region code' }, { status: 400 });
  const chart = await popular(region).catch(() => null);
  if (!chart) return NextResponse.json({ verified: false, items: [], message: 'The YouTube chart is unavailable. Caption hashtags are AI relevance suggestions.' });
  const words = query.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const items = chart.items.map((item) => {
    const text = [item.title, ...item.tags].join(' ').toLocaleLowerCase();
    return { id: item.id, title: item.title, chartPosition: item.chartPosition, matchCount: words.filter((word) => text.includes(word)).length };
  }).filter((item) => !words.length || item.matchCount).sort((a, b) => b.matchCount - a.matchCount);
  return NextResponse.json({ verified: true, region, source: chart.source, checkedAt: chart.checkedAt, items });
}
