import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { getSessionUser, stringToUuid, getConnectedAccountsFromCookie } from '@/lib/auth/session';
import { getPlatformAdapter } from '@/integrations';

const YouTubePublishSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';
    const validUserId = stringToUuid(userId);

    const json = await req.json();
    const parsed = YouTubePublishSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid YouTube payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { title, description, mediaUrl, tags } = parsed.data;

    if (!mediaUrl) {
      return NextResponse.json(
        {
          error: 'YouTube requires a video file (.mp4, .mov, .webm). Please upload a video asset before publishing to YouTube.',
          actionRequired: 'Attach a video file in the Publish Now tab.',
        },
        { status: 400 }
      );
    }

    // Resolve connected YouTube account
    const supabase = createAdminClient();
    let account: any = null;
    try {
      const { data } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', validUserId)
        .eq('platform', 'youtube')
        .eq('status', 'active')
        .maybeSingle();
      if (data) account = data;
    } catch {}

    if (!account) {
      const cookieAccounts = getConnectedAccountsFromCookie(req);
      account = cookieAccounts.find((a) => a.platform === 'youtube');
    }

    if (!account) {
      return NextResponse.json(
        {
          error: 'YouTube account is not connected. Please connect your YouTube / Google account in the Authentication tab.',
        },
        { status: 400 }
      );
    }

    let accessToken = account.accessToken || '';
    if (!accessToken && account.encrypted_access_token) {
      accessToken = decryptToken(account.encrypted_access_token);
    }

    const adapter = getPlatformAdapter('youtube');
    const result = await adapter.publish({
      title,
      text: description || title,
      mediaUrl,
      mediaType: 'video',
      tags,
      accessToken,
      accountId: account.external_account_id,
      metadata: account.metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.errorMessage || 'YouTube publishing failed',
          errorCode: result.errorCode,
          actionRequired: result.actionRequired,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      videoId: result.externalPostId,
      permalink: result.externalPostUrl,
      publishedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'YouTube publishing failed' }, { status: 500 });
  }
}
