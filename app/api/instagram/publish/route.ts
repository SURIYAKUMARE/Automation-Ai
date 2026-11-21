import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { getSessionUser } from '@/lib/auth/session';

const PublishSchema = z.object({
  mediaUrl: z.string().url(),
  caption: z.string().min(1),
  mediaType: z.enum(['IMAGE', 'VIDEO', 'REELS', 'CAROUSEL']).default('IMAGE'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const json = await req.json();
    const parsed = PublishSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid publishing payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { mediaUrl, caption, mediaType } = parsed.data;

    const supabase = createAdminClient();
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'instagram')
      .eq('status', 'active')
      .maybeSingle();

    if (!account) {
      return NextResponse.json(
        {
          error: 'Instagram account not connected or access token expired.',
          actionRequired: 'Connect an Instagram Professional account in Connected Accounts.',
        },
        { status: 400 }
      );
    }

    const accessToken = decryptToken(account.encrypted_access_token);
    const igId = account.external_account_id;

    // STEP 1: Create media container
    const isVideo = mediaType === 'VIDEO' || mediaType === 'REELS';
    const containerParams = new URLSearchParams({
      access_token: accessToken,
      caption,
    });

    if (isVideo) {
      containerParams.append('media_type', 'REELS');
      containerParams.append('video_url', mediaUrl);
    } else {
      containerParams.append('image_url', mediaUrl);
    }

    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}/media?${containerParams.toString()}`,
      { method: 'POST' }
    );

    if (!containerRes.ok) {
      const err = await containerRes.text();
      return NextResponse.json(
        {
          error: `Failed to create Instagram media container: ${err}`,
          status: containerRes.status,
        },
        { status: 502 }
      );
    }

    const containerData = await containerRes.json();
    const creationId = containerData.id;

    // STEP 2: Publish media container
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken,
    });

    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}/media_publish?${publishParams.toString()}`,
      { method: 'POST' }
    );

    if (!publishRes.ok) {
      const err = await publishRes.text();
      return NextResponse.json(
        {
          error: `Failed to publish Instagram media container: ${err}`,
          status: publishRes.status,
        },
        { status: 502 }
      );
    }

    const publishData = await publishRes.json();
    const postId = publishData.id;

    return NextResponse.json({
      success: true,
      postId,
      permalink: `https://www.instagram.com/p/${postId}/`,
      publishedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Instagram publish error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
