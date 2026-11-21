import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { executePostPublishing } from '@/lib/publishing/engine';
import { getSessionUser, stringToUuid, getConnectedAccountsFromCookie } from '@/lib/auth/session';
import { SocialPlatform, PublishingMode } from '@/types';

const CreatePostSchema = z.object({
  userId: z.string(),
  title: z.string().optional(),
  mediaAssetId: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(['image', 'video']).optional(),
  rawPrompt: z.string().optional(),
  publishingMode: z.enum(['automatic', 'manual_approval']).default('manual_approval'),
  scheduledFor: z.string().optional(),
  targetPlatforms: z.array(z.enum(['linkedin', 'youtube', 'instagram', 'facebook'])),
  variants: z.array(
    z.object({
      platform: z.enum(['linkedin', 'youtube', 'instagram', 'facebook']),
      caption: z.string().min(1),
      title: z.string().optional(),
      hashtags: z.array(z.string()).default([]),
      callToAction: z.string().optional(),
      language: z.string().default('English'),
      tone: z.string().default('Professional'),
      isApproved: z.boolean().default(false),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = CreatePostSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid post creation payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      userId,
      title,
      mediaAssetId,
      mediaUrl: directMediaUrl,
      mediaType: directMediaType,
      rawPrompt,
      publishingMode,
      scheduledFor,
      targetPlatforms,
      variants,
    } = parsed.data;

    let mediaUrl = directMediaUrl;
    let mediaType: 'image' | 'video' | undefined = directMediaType;

    const user = await getSessionUser(req);
    const validUserId = stringToUuid(user?.id || userId || '00000000-0000-0000-0000-000000000001');
    const cookieAccounts = getConnectedAccountsFromCookie(req);

    const supabase = createAdminClient();

    // If mediaAssetId provided and mediaUrl not set, resolve from media_assets
    if (mediaAssetId && !mediaUrl) {
      try {
        const { data: assetData } = await supabase
          .from('media_assets')
          .select('file_path, media_type')
          .eq('id', mediaAssetId)
          .maybeSingle();

        if (assetData) {
          mediaType = mediaType || (assetData.media_type === 'video' ? 'video' : 'image');
          if (assetData.file_path.startsWith('http')) {
            mediaUrl = assetData.file_path;
          } else {
            const { data: signed } = await supabase.storage
              .from('media-assets')
              .createSignedUrl(assetData.file_path, 86400);
            mediaUrl = signed?.signedUrl;
          }
        }
      } catch (assetErr) {
        console.warn('Failed resolving media_asset file path:', assetErr);
      }
    }

    // Ensure profile exists in profiles table
    try {
      await supabase.from('profiles').upsert({
        id: validUserId,
        email: user?.email || 'user@socialsync.ai',
        full_name: user?.name || 'SocialSync User',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('Profile upsert skipped:', e);
    }

    // 1. Fetch user's connected social accounts for the target platforms
    let targetAccounts: any[] = [];
    try {
      const { data: accounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', validUserId)
        .in('platform', targetPlatforms)
        .eq('status', 'active');
      if (accounts) targetAccounts = accounts;
    } catch {}

    // Add cookie-backed accounts if not in DB and possessing valid access token
    for (const ca of cookieAccounts) {
      if (
        targetPlatforms.includes(ca.platform) &&
        !targetAccounts.some((a) => a.platform === ca.platform) &&
        (ca.encrypted_access_token || ca.accessToken)
      ) {
        targetAccounts.push(ca);
      }
    }

    const initialStatus = scheduledFor
      ? 'scheduled'
      : publishingMode === 'automatic'
      ? 'publishing'
      : 'pending_approval';

    // 2. Insert Post record
    let post: any = null;
    try {
      const { data, error: postErr } = await supabase
        .from('posts')
        .insert({
          user_id: validUserId,
          media_asset_id: mediaAssetId || null,
          title: title || 'SocialSync Campaign Post',
          raw_prompt: rawPrompt || null,
          publishing_mode: publishingMode as PublishingMode,
          status: initialStatus,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          target_platforms: targetPlatforms,
        })
        .select()
        .single();
      if (!postErr && data) post = data;
    } catch (err) {
      console.warn('Post DB insert skipped, using memory post:', err);
    }

    if (!post) {
      post = {
        id: `post_${Date.now()}`,
        user_id: validUserId,
        title: title || 'SocialSync Campaign Post',
        publishing_mode: publishingMode,
        status: initialStatus,
        scheduled_for: scheduledFor || null,
        target_platforms: targetPlatforms,
        created_at: new Date().toISOString(),
      };
    }

    // 3. Insert Post Variants
    try {
      const variantInserts = variants.map((v) => ({
        post_id: post.id,
        platform: v.platform as SocialPlatform,
        caption: v.caption,
        title: v.title || null,
        hashtags: v.hashtags,
        call_to_action: v.callToAction || null,
        language: v.language,
        tone: v.tone,
        is_approved: publishingMode === 'automatic' ? true : v.isApproved,
      }));
      await supabase.from('post_variants').insert(variantInserts);
    } catch {}

    // 4. Insert Post Targets
    try {
      const targetInserts = targetAccounts.map((acc: any) => ({
        post_id: post.id,
        social_account_id: acc.id,
        platform: acc.platform as SocialPlatform,
        status: initialStatus,
      }));
      await supabase.from('post_targets').insert(targetInserts);
    } catch {}

    // 5. If scheduled, insert into publishing_jobs
    if (scheduledFor) {
      try {
        await supabase.from('publishing_jobs').insert({
          post_id: post.id,
          user_id: validUserId,
          run_at: new Date(scheduledFor).toISOString(),
          status: 'queued',
          idempotency_key: `job_${post.id}_${Date.now()}`,
        });
      } catch {}

      return NextResponse.json({
        success: true,
        post,
        message: 'Post scheduled successfully.',
      });
    }

    // 6. If Mode A (Fully Automatic) and publish immediate, execute right now!
    if (publishingMode === 'automatic') {
      const summary = await executePostPublishing({
        postId: post.id,
        userId: validUserId,
        cookieAccounts,
        postOverride: {
          ...post,
          media: mediaUrl ? { file_path: mediaUrl, media_type: mediaType } : undefined,
        },
        variantsOverride: variants,
        targetPlatformsOverride: targetPlatforms,
        mediaUrlOverride: mediaUrl,
        mediaTypeOverride: mediaType,
      });

      return NextResponse.json({
        success: true,
        post,
        summary,
        message: summary.failureCount === 0
          ? 'Post published successfully across selected platforms.'
          : 'Publishing completed with provider notices. Check execution logs.',
      });
    }

    // Mode B: Manual Approval pending
    return NextResponse.json({
      success: true,
      post,
      message: 'Post created and queued in Approval Center for review.',
    });
  } catch (err: any) {
    console.error('Post creation error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error creating post' }, { status: 500 });
  }
}
