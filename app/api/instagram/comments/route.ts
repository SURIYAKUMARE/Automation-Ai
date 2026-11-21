import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get('mediaId');

    if (!mediaId) {
      return NextResponse.json({ error: 'Missing required mediaId parameter' }, { status: 400 });
    }

    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const userId = user.id;

    const supabase = createAdminClient();
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'instagram')
      .eq('status', 'active')
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ comments: [] });
    }

    try {
      const accessToken = decryptToken(account.encrypted_access_token);
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${mediaId}/comments?fields=id,text,timestamp,username,like_count&access_token=${accessToken}`
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ comments: data.data || [] });
      }
    } catch {
      // Return empty if API call fails
    }

    return NextResponse.json({
      comments: [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const PostReplySchema = z.object({
  commentId: z.string(),
  message: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = PostReplySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid reply data' }, { status: 400 });
    }

    const { commentId, message } = parsed.data;
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const userId = user.id;

    const supabase = createAdminClient();
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'instagram')
      .eq('status', 'active')
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: 'Instagram account not connected' }, { status: 400 });
    }

    const accessToken = decryptToken(account.encrypted_access_token);
    const res = await fetch(`https://graph.facebook.com/v21.0/${commentId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        message,
        access_token: accessToken,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Failed to post reply: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, replyId: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
