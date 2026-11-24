import { NextRequest, NextResponse, after } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { captionSchema, platformSchema, postIdSchema } from '@/lib/publishing/campaign';
import { captionLimits, mediaCompatibilityError } from '@/lib/publishing/compatibility';
import { dispatchCampaign } from '@/lib/publishing/engine';

export const maxDuration = 60;

const CreatePost = z.object({
  requestId: postIdSchema.nullable().optional(),
  mediaAssetId: postIdSchema.nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
  title: z.string().trim().max(200).optional(),
  rawPrompt: z.string().trim().max(4000).optional(),
  draft: z.boolean().default(false),
  replaceDraft: z.boolean().default(false),
  queueNext: z.boolean().default(false),
  publishingMode: z.enum(['automatic', 'manual_approval']).default('manual_approval'),
  scheduledFor: z.string().datetime({ offset: true }).nullable().optional(),
  recurrences: z.array(z.string().datetime({ offset: true })).max(7).default([]),
  targetPlatforms: z.array(platformSchema).min(1).max(4),
  accountIds: z.array(postIdSchema).max(20).nullable().optional(),
  variants: z.array(z.object({
    platform: platformSchema,
    caption: z.string().max(5000).default(''),
    title: z.string().trim().max(200).optional(),
    hashtags: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
    keywords: z.array(z.string().trim().min(1).max(100)).max(15).default([]),
    youtubePrivacy: z.enum(['private', 'unlisted', 'public']).optional(),
    altText: z.string().trim().max(1000).optional(),
    callToAction: z.string().max(400).optional(),
    language: z.enum(['English', 'Tamil', 'Tanglish']).default('English'),
    tone: z.string().max(40).default('Professional'),
  })).max(4),
}).refine((post) => {
  if (post.draft) return true;
  return new Set(post.targetPlatforms).size === post.targetPlatforms.length &&
    post.variants.length > 0 &&
    post.targetPlatforms.every((platform) => post.variants.some((v) => v.platform === platform));
}, { message: 'All selected platforms must have configured content' });

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const rawPayload = await req.json().catch(() => null);
  if (!rawPayload) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  // Normalize payload: accept both variants and postVariants, handle draft flag, snake_case aliases, and nullable IDs
  const rawVariants = (rawPayload.variants || rawPayload.postVariants || []).map((v: any) => ({
    ...v,
    youtubePrivacy: v.youtubePrivacy || v.youtube_privacy,
    altText: v.altText || v.alt_text,
    callToAction: v.callToAction || v.call_to_action,
  }));
  const isDraft = rawPayload.draft === true || rawPayload.status === 'draft';
  const normalized = {
    ...rawPayload,
    draft: isDraft,
    variants: rawVariants,
    mediaAssetId: rawPayload.mediaAssetId || undefined,
    accountIds: Array.isArray(rawPayload.accountIds) && rawPayload.accountIds.length ? rawPayload.accountIds : undefined,
    scheduledFor: rawPayload.scheduledFor || undefined,
  };

  const parsed = CreatePost.safeParse(normalized);
  if (!parsed.success) {
    const firstErr = parsed.error.issues[0];
    const field = firstErr.path.length ? firstErr.path.join('.') : 'Form';
    const errMsg = `${field}: ${firstErr.message}`;
    console.error('CreatePost validation failed:', parsed.error.issues);
    return NextResponse.json({ error: errMsg, details: parsed.error.issues }, { status: 400 });
  }
  const post = parsed.data;
  if (post.queueNext && (post.draft || post.recurrences.length || post.scheduledFor)) {
    return NextResponse.json({ error: 'Choose either the next queue slot or a custom schedule' }, { status: 400 });
  }
  if (!post.draft && post.scheduledFor && Date.parse(post.scheduledFor) <= Date.now()) {
    return NextResponse.json({ error: 'Choose a future date and time' }, { status: 400 });
  }
  if (!post.draft && post.accountIds?.length === 0 && !post.targetPlatforms?.length) {
    return NextResponse.json({ error: 'Choose a connected account for each platform' }, { status: 400 });
  }
  if (post.recurrences.length && (post.draft || !post.scheduledFor || post.publishingMode !== 'automatic' ||
    post.recurrences.some((date, index) => {
      const previous = index ? post.recurrences[index - 1] : post.scheduledFor!;
      return Math.abs(Date.parse(date) - Date.parse(previous) - 7 * 86_400_000) > 7_200_000;
    }))) {
    return NextResponse.json({ error: 'Weekly repeats require an approved future schedule' }, { status: 400 });
  }
  try {
    const db = createAdminClient();
    const id = post.requestId ?? randomUUID();
    if (post.requestId) {
      const existing = await db.from('posts').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data && (!post.replaceDraft || existing.data.status !== 'draft')) {
        return NextResponse.json({ success: true, post: existing.data });
      }
      if (!existing.data && post.replaceDraft) return NextResponse.json({ error: 'Draft unavailable' }, { status: 404 });
    }
    let media: { mime_type: string; width?: number; height?: number; duration_seconds?: number; video_codec?: string } | undefined;
    if (post.mediaAssetId) {
      const { data, error } = await db.from('media_assets').select('mime_type,width,height,duration_seconds,video_codec')
        .eq('id', post.mediaAssetId).eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: 'Uploaded media is unavailable' }, { status: 404 });
      media = data;
    }

    if (!post.draft) {
      for (const variant of post.variants) {
        if (!variant.caption) return NextResponse.json({ error: 'Add a caption for ' + variant.platform }, { status: 400 });
        const compatibility = mediaCompatibilityError(variant.platform, media);
        if (compatibility) return NextResponse.json({ error: compatibility }, { status: 400 });
        if (variant.platform === 'youtube' && (!variant.title || variant.title.length > 100)) {
          return NextResponse.json({ error: 'YouTube requires a video and a title of at most 100 characters' }, { status: 400 });
        }
        const existingTags = new Set((variant.caption.match(/#[\p{L}\p{M}\p{N}_]+/gu) || []).map((t: string) => t.toLowerCase()));
        const extraTags = (variant.hashtags || []).filter((t: string) => !existingTags.has((t.startsWith('#') ? t : '#' + t).toLowerCase()));
        const length = variant.caption.length + (extraTags.length ? 2 + extraTags.join(' ').length : 0);
        if (length > captionLimits[variant.platform]) {
          return NextResponse.json({ error: variant.platform + ' caption and hashtags exceed the length limit' }, { status: 400 });
        }
      }
    }

    const { data: allActiveAccounts, error: accountError } = await db
      .from('social_accounts')
      .select('id, platform')
      .eq('user_id', user.id)
      .in('platform', post.targetPlatforms)
      .eq('status', 'active');
    if (accountError) throw accountError;

    const available = allActiveAccounts || [];
    const accounts: { id: string; platform: string }[] = [];

    for (const platform of post.targetPlatforms) {
      const chosen = available.find((a) => a.platform === platform && post.accountIds?.includes(a.id)) ||
                     available.find((a) => a.platform === platform);
      if (chosen && !accounts.some((a) => a.id === chosen.id)) {
        accounts.push(chosen);
      }
    }

    if (!post.draft && accounts.length === 0) {
      return NextResponse.json({ error: 'Please connect at least one active social account in Social Accounts before publishing.' }, { status: 409 });
    }
    const status = post.draft ? 'draft' : post.publishingMode === 'manual_approval' ? 'pending_approval' :
      post.scheduledFor ? 'scheduled' : 'approved';
    const { data, error } = await db.rpc(post.queueNext ? 'create_queued_campaign' : 'create_campaign', {
      owner_id: user.id,
      campaign: {
        id, title: post.title || 'Untitled post', raw_prompt: post.rawPrompt, media_asset_id: post.mediaAssetId,
        publishing_mode: post.publishingMode, status, scheduled_for: post.draft ? null : post.scheduledFor,
        target_platforms: post.targetPlatforms,
        recurrences: post.recurrences,
        replace_draft: post.replaceDraft,
      },
      variants: post.variants.map((variant) => ({ ...variant, call_to_action: variant.callToAction, youtube_privacy: variant.youtubePrivacy, alt_text: variant.altText })),
      destinations: accounts,
    });
    if (error?.message.includes('Connect an active account')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error || !data?.id) throw error ?? new Error('Post was not saved');

    if (status === 'approved' && !post.scheduledFor && !post.queueNext && post.publishingMode === 'automatic') {
      after(async () => {
        try {
          await dispatchCampaign(db, user.id, id);
        } catch (dispatchErr) {
          console.error('Async dispatchCampaign error:', dispatchErr);
        }
      });
    }

    return NextResponse.json({ success: true, post: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Could not save the post. Try again.' }, { status: 503 });
  }
}
