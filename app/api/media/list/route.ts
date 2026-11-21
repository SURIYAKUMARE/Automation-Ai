import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { signMedia } from '@/lib/publishing/media';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { data, error } = await createAdminClient().from('media_assets').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: 'Could not list uploads' }, { status: 503 });
  const media = await Promise.all(data.map(async (item) => ({ ...item, previewUrl: await signMedia(item.file_path, user.id).catch(() => null) })));
  return NextResponse.json({ success: true, media, total: media.length });
}
