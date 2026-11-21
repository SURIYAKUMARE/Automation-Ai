import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { getSessionUser } from '@/lib/auth/session';

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

    const supabase = createAdminClient();
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'linkedin')
      .eq('status', 'active')
      .maybeSingle();

    if (!account) {
      return NextResponse.json(
        { error: 'LinkedIn account is not connected.' },
        { status: 400 }
      );
    }

    const accessToken = decryptToken(account.encrypted_access_token);
    const authorUrn = organizationUrn || `urn:li:person:${account.external_account_id}`;

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
