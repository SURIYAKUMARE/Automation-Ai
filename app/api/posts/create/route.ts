import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { executePostPublishing } from '@/lib/publishing/engine';
import { SocialPlatform, PublishingMode } from '@/types';

const CreatePostSchema = z.object({
  userId: z.string(),
  title: z.string().optional(),
  mediaAssetId: z.string().uuid().optional(),
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
      rawPrompt,
      publishingMode,
      scheduledFor,
      targetPlatforms,
      variants,
    } = parsed.data;

    const supabase = createAdminClient();

    // 1. Fetch user's connected social accounts for the target platforms
    const { data: accounts, error: accErr } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .in('platform', targetPlatforms)
      .eq('status', 'active');

    if (accErr) {
      return NextResponse.json({ error: `Failed to query connected accounts: ${accErr.message}` }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        {
          error: 'No active connected social accounts found for selected platforms.',
          actionRequired: 'Connect accounts in Connected Social Accounts first.',
        },
        { status: 400 }
      );
    }

    const initialStatus = scheduledFor
      ? 'scheduled'
      : publishingMode === 'automatic'
      ? 'publishing'
      : 'pending_approval';

    // 2. Insert Post record
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
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

    if (postErr || !post) {
      return NextResponse.json({ error: `Post creation failed: ${postErr?.message}` }, { status: 500 });
    }

    // 3. Insert Post Variants
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

    // 4. Insert Post Targets
    const targetInserts = accounts.map((acc) => ({
      post_id: post.id,
      social_account_id: acc.id,
      platform: acc.platform as SocialPlatform,
      status: initialStatus,
    }));

    await supabase.from('post_targets').insert(targetInserts);

    // 5. If scheduled, insert into publishing_jobs
    if (scheduledFor) {
      await supabase.from('publishing_jobs').insert({
        post_id: post.id,
        user_id: userId,
        run_at: new Date(scheduledFor).toISOString(),
        status: 'queued',
        idempotency_key: `job_${post.id}_${Date.now()}`,
      });

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
        userId,
      });

      return NextResponse.json({
        success: true,
        post,
        summary,
        message: 'Post published via Fully Automatic mode.',
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
