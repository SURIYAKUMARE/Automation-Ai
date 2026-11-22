import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { platformSchema, postIdSchema } from '@/lib/publishing/campaign';
import { getPlatformAdapter } from '@/integrations';
import { getAccountAccessToken } from '@/lib/publishing/engine';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  try {
    const db = createAdminClient();
    const { data: userProfiles } = await db.from('profiles').select('id').eq('email', user.email.toLowerCase());
    const userIds = userProfiles && userProfiles.length > 0 ? userProfiles.map((p) => p.id) : [user.id];

    const { data, error } = await db.from('social_accounts')
      .select('id,platform,external_account_id,account_name,account_handle,avatar_url,granted_scopes,token_expires_at,status,last_validated_at,user_id')
      .in('user_id', userIds).neq('status', 'revoked').order('created_at', { ascending: false });
    if (error) throw error;

    // Deduplicate by platform and external_account_id
    const seen = new Set<string>();
    const deduplicated = [];
    for (const account of data || []) {
      const key = `${account.platform}:${account.external_account_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        if (account.user_id !== user.id) {
          db.from('social_accounts').update({ user_id: user.id }).eq('id', account.id).then(() => {});
        }
        deduplicated.push(account);
      }
    }

    const accounts = deduplicated.map((account) => ({
      ...account,
      expires_in_days: account.token_expires_at ? Math.max(0, Math.ceil((Date.parse(account.token_expires_at) - Date.now()) / 86_400_000)) : null,
    }));
    return NextResponse.json({ success: true, accounts, total: accounts.length });
  } catch {
    return NextResponse.json({ error: 'Could not load connected accounts' }, { status: 503 });
  }
}

const ConnectTokenSchema = z.object({
  platform: platformSchema,
  accessToken: z.string().trim().min(10, 'Access token is required'),
  pageId: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const rawBody = await req.json().catch(() => null);

  // Flow A: Verify existing account
  if (rawBody?.accountId) {
    const id = postIdSchema.safeParse(rawBody.accountId);
    if (!id.success) return NextResponse.json({ error: 'Choose an account to check' }, { status: 400 });
    try {
      const db = createAdminClient();
      const { data: account, error } = await db.from('social_accounts')
        .select('id,user_id,platform,status,external_account_id,encrypted_access_token,encrypted_refresh_token,token_expires_at')
        .eq('id', id.data).eq('user_id', user.id).eq('status', 'active').maybeSingle();
      if (error) throw error;
      if (!account) return NextResponse.json({ error: 'Connected account unavailable' }, { status: 404 });
      const token = await getAccountAccessToken(db, account);
      const valid = token && await getPlatformAdapter(account.platform).validateToken(token, account.external_account_id);
      if (!valid) return NextResponse.json({ error: 'The provider could not verify this connection. Reconnect the account and try again.' }, { status: 409 });
      const now = new Date().toISOString();
      const saved = await db.from('social_accounts').update({ last_validated_at: now })
        .eq('id', id.data).eq('user_id', user.id).eq('status', 'active').select('id').maybeSingle();
      if (saved.error) throw saved.error;
      if (!saved.data) return NextResponse.json({ error: 'Connected account unavailable' }, { status: 404 });
      return NextResponse.json({ success: true, lastValidatedAt: now });
    } catch {
      return NextResponse.json({ error: 'Could not verify the connection. Try again or reconnect the account.' }, { status: 503 });
    }
  }

  // Flow B: Connect new account with access token
  const input = ConnectTokenSchema.safeParse(rawBody);
  if (!input.success) {
    return NextResponse.json({ error: 'Invalid payload. Platform and access token are required.' }, { status: 400 });
  }

  const { platform, accessToken } = input.data;

  try {
    let externalAccountId = '';
    let accountName = '';
    let accountHandle = '';
    let avatarUrl: string | null = null;
    let grantedScopes: string[] = [];
    let tokenToSave = accessToken;
    let metadata: Record<string, any> = {};

    if (platform === 'instagram') {
      // 1. Try finding assigned Instagram accounts (System User or Business Manager)
      const assignedRes = await fetch(
        `https://graph.facebook.com/v23.0/me/assigned_instagram_accounts?access_token=${accessToken}`
      );
      let igId = '';
      if (assignedRes.ok) {
        const assignedData = await assignedRes.json();
        if (assignedData.data && assignedData.data.length > 0) {
          igId = assignedData.data[0].id;
        }
      }

      // 2. If not found, try Facebook Pages linked to Instagram Business accounts
      if (!igId) {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v23.0/me/accounts?fields=id,name,instagram_business_account{id,username,name,profile_picture_url}&access_token=${accessToken}`
        );
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json();
          for (const page of pagesData.data || []) {
            if (page.instagram_business_account) {
              igId = page.instagram_business_account.id;
              break;
            }
          }
        }
      }

      // 3. Fallback to /me endpoint
      if (!igId) {
        const meRes = await fetch(`https://graph.facebook.com/v23.0/me?fields=id,username,name&access_token=${accessToken}`);
        if (meRes.ok) {
          const meData = await meRes.json();
          igId = meData.id;
        }
      }

      if (!igId) {
        return NextResponse.json({ error: 'Could not discover an Instagram account associated with this token.' }, { status: 400 });
      }

      // Retrieve full profile details for this Instagram account
      const igRes = await fetch(
        `https://graph.facebook.com/v23.0/${igId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${accessToken}`
      );
      if (!igRes.ok) {
        const errJson = await igRes.json().catch(() => ({}));
        return NextResponse.json({ error: errJson.error?.message || 'Could not validate Instagram account details.' }, { status: 400 });
      }

      const igData = await igRes.json();
      externalAccountId = igData.id;
      accountName = igData.name || igData.username || 'Instagram Professional';
      accountHandle = `@${igData.username || igData.id}`;
      avatarUrl = igData.profile_picture_url || null;
      grantedScopes = ['instagram_basic', 'instagram_content_publish', 'public_profile'];
      metadata = igData;
    } else if (platform === 'facebook') {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token,picture&access_token=${accessToken}`
      );
      if (!pagesRes.ok) {
        // Fallback to User profile
        const meRes = await fetch(`https://graph.facebook.com/v23.0/me?fields=id,name,picture&access_token=${accessToken}`);
        if (!meRes.ok) {
          const err = await meRes.json().catch(() => ({}));
          return NextResponse.json({ error: err.error?.message || 'Could not validate Facebook access token.' }, { status: 400 });
        }
        const meData = await meRes.json();
        externalAccountId = meData.id;
        accountName = meData.name || 'Facebook User';
        accountHandle = `@${meData.name}`;
        avatarUrl = meData.picture?.data?.url || null;
      } else {
        const pagesData = await pagesRes.json();
        if (pagesData.data && pagesData.data.length > 0) {
          const page = pagesData.data[0];
          externalAccountId = page.id;
          accountName = page.name || 'Facebook Page';
          accountHandle = `@${page.name}`;
          avatarUrl = page.picture?.data?.url || null;
          if (page.access_token) tokenToSave = page.access_token;
        } else {
          return NextResponse.json({ error: 'No Facebook Page found with publishing permissions for this token.' }, { status: 400 });
        }
      }
      grantedScopes = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'public_profile'];
    } else if (platform === 'linkedin') {
      const liRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!liRes.ok) {
        return NextResponse.json({ error: 'Invalid LinkedIn access token or expired session.' }, { status: 400 });
      }
      const liData = await liRes.json();
      externalAccountId = liData.sub;
      accountName = liData.name || 'LinkedIn Member';
      accountHandle = liData.email || `@${liData.name}`;
      avatarUrl = liData.picture || null;
      grantedScopes = ['openid', 'profile', 'email', 'w_member_social'];
      metadata = liData;
    } else if (platform === 'youtube') {
      const ytRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!ytRes.ok) {
        return NextResponse.json({ error: 'Invalid Google / YouTube access token or missing YouTube scope.' }, { status: 400 });
      }
      const ytData = await ytRes.json();
      if (!ytData.items || ytData.items.length === 0) {
        return NextResponse.json({ error: 'No YouTube channel found for this Google account.' }, { status: 400 });
      }
      const channel = ytData.items[0];
      externalAccountId = channel.id;
      accountName = channel.snippet?.title || 'YouTube Channel';
      accountHandle = channel.snippet?.customUrl || `@${channel.snippet?.title}`;
      avatarUrl = channel.snippet?.thumbnails?.default?.url || null;
      grantedScopes = ['youtube.upload', 'youtube.readonly'];
      metadata = channel;
    }

    // Encrypt token
    const { encryptToken } = await import('@/lib/security/encryption');
    const encryptedToken = encryptToken(tokenToSave);

    const db = createAdminClient();
    // Ensure profile exists
    await db.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.name || user.email.split('@')[0],
      avatar_url: user.avatarUrl || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    const { data: savedAccount, error: saveError } = await db.from('social_accounts').upsert({
      user_id: user.id,
      platform,
      external_account_id: externalAccountId,
      account_name: accountName,
      account_handle: accountHandle,
      avatar_url: avatarUrl,
      granted_scopes: grantedScopes,
      encrypted_access_token: encryptedToken,
      status: 'active',
      metadata,
      last_validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform,external_account_id' }).select().single();

    if (saveError) {
      console.error('Error saving account via token:', saveError);
      return NextResponse.json({ error: 'Failed to save connected account: ' + saveError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      account: {
        id: savedAccount.id,
        platform: savedAccount.platform,
        accountName: savedAccount.account_name,
        accountHandle: savedAccount.account_handle,
        avatarUrl: savedAccount.avatar_url,
        status: savedAccount.status,
      },
    });
  } catch (err: any) {
    console.error('Failed to connect token:', err);
    return NextResponse.json({ error: err.message || 'Token connection failed' }, { status: 500 });
  }
}

const Disconnect = z.object({ accountId: postIdSchema.optional(), platform: platformSchema.optional() })
  .refine((body) => Boolean(body.accountId || body.platform));

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const input = Disconnect.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Choose an account to disconnect' }, { status: 400 });
  try {
    let query = createAdminClient().from('social_accounts').update({
      status: 'revoked', encrypted_access_token: '', encrypted_refresh_token: null, updated_at: new Date().toISOString(),
    }).eq('user_id', user.id).neq('status', 'revoked');
    if (input.data.accountId) query = query.eq('id', input.data.accountId);
    if (input.data.platform) query = query.eq('platform', input.data.platform);
    const { data, error } = await query.select('id');
    if (error) throw error;
    if (!data.length) return NextResponse.json({ error: 'Connected account unavailable' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Could not disconnect the account' }, { status: 503 });
  }
}
