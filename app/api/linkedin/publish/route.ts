import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { getSessionUser, stringToUuid, getConnectedAccountsFromCookie } from '@/lib/auth/session';

const LinkedInPublishSchema = z.object({
  commentary: z.string().min(1),
  mediaUrl: z.string().url().optional(),
  title: z.string().optional(),
  organizationUrn: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const json = await req.json();
    const parsed = LinkedInPublishSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid LinkedIn payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { commentary, mediaUrl, title, organizationUrn } = parsed.data;

    const validUserId = stringToUuid(userId);

    const supabase = createAdminClient();
    let account: any = null;
    try {
      const { data } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', validUserId)
        .eq('platform', 'linkedin')
        .eq('status', 'active')
        .maybeSingle();
      if (data) account = data;
    } catch {}

    if (!account) {
      const cookieAccounts = getConnectedAccountsFromCookie(req);
      account = cookieAccounts.find((a) => a.platform === 'linkedin');
    }

    if (!account) {
      return NextResponse.json(
        { error: 'LinkedIn account is not connected. Please connect LinkedIn in the Authentication tab.' },
        { status: 400 }
      );
    }

    let accessToken = account.accessToken || '';
    if (!accessToken && account.encrypted_access_token) {
      accessToken = decryptToken(account.encrypted_access_token);
    }
    const authorUrn = organizationUrn || (account.external_account_id?.startsWith('urn:li:') ? account.external_account_id : `urn:li:person:${account.external_account_id}`);

    // Structure LinkedIn UGC Post payload
    const ugcPayload: any = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: commentary,
          },
          shareMediaCategory: mediaUrl ? 'ARTICLE' : 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    if (mediaUrl) {
      ugcPayload.specificContent['com.linkedin.ugc.ShareContent'].media = [
        {
          status: 'READY',
          originalUrl: mediaUrl,
          title: {
            text: title || 'SocialSync AI Update',
          },
        },
      ];
    }

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(ugcPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `LinkedIn UGC API failed: ${errText}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const ugcUrn = data.id || res.headers.get('x-restli-id') || `urn:li:ugcPost:${Date.now()}`;

    return NextResponse.json({
      success: true,
      ugcUrn,
      permalink: `https://www.linkedin.com/feed/update/${ugcUrn}/`,
      publishedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
