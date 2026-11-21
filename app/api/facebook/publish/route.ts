import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { getSessionUser } from '@/lib/auth/session';

const FacebookPublishSchema = z.object({
  message: z.string().min(1),
  mediaUrl: z.string().url().optional(),
  pageId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const json = await req.json();
    const parsed = FacebookPublishSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid Facebook post payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { message, mediaUrl, pageId } = parsed.data;

    const supabase = createAdminClient();
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'facebook')
      .eq('status', 'active')
      .maybeSingle();

    if (!account) {
      return NextResponse.json(
        { error: 'Facebook Page account is not connected.' },
        { status: 400 }
      );
    }

    const accessToken = decryptToken(account.encrypted_access_token);
    const targetPageId = pageId || account.external_account_id;

    // Direct publish to Page Feed
    const endpoint = mediaUrl
      ? `https://graph.facebook.com/v21.0/${targetPageId}/photos`
      : `https://graph.facebook.com/v21.0/${targetPageId}/feed`;

    const bodyParams = new URLSearchParams({
      access_token: accessToken,
    });

    if (mediaUrl) {
      bodyParams.append('url', mediaUrl);
      bodyParams.append('caption', message);
    } else {
      bodyParams.append('message', message);
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Facebook publishing failed: ${errText}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const postId = data.id || data.post_id;

    return NextResponse.json({
      success: true,
      postId,
      permalink: `https://www.facebook.com/${postId}`,
      publishedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
