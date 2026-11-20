import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { getPlatformAdapter } from '@/integrations';
import { SocialPlatform, PostStatus } from '@/types';

interface ExecutePublishOptions {
  postId: string;
  userId: string;
}

export interface PublishExecutionSummary {
  postId: string;
  totalTargets: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    platform: SocialPlatform;
    success: boolean;
    externalPostId?: string;
    externalPostUrl?: string;
    errorMessage?: string;
    actionRequired?: string;
  }>;
}

/**
 * Core publishing engine that resolves accounts, decrypts credentials,
 * calls official provider adapters, and logs immutable publishing attempts.
 */
export async function executePostPublishing({
  postId,
  userId,
}: ExecutePublishOptions): Promise<PublishExecutionSummary> {
  const supabase = createAdminClient();

  // 1. Fetch Post, Variants, Targets, and Media Asset
  const { data: post, error: postErr } = await supabase
    .from('posts')
    .select(`
      *,
      media:media_assets(*),
      variants:post_variants(*),
      targets:post_targets(
        *,
        account:social_accounts(*)
      )
    `)
    .eq('id', postId)
    .eq('user_id', userId)
    .single();

  if (postErr || !post) {
    throw new Error(`Post not found or unauthorized: ${postErr?.message}`);
  }

  // Update status to 'publishing'
  await supabase
    .from('posts')
    .update({ status: 'publishing' as PostStatus, updated_at: new Date().toISOString() })
    .eq('id', postId);

  const targets = post.targets || [];
  const variants = post.variants || [];
  const media = post.media;

  const results: PublishExecutionSummary['results'] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const target of targets) {
    const platform = target.platform as SocialPlatform;
    const account = target.account;

    if (!account) {
      const err = `No connected account found for platform ${platform}`;
      results.push({ platform, success: false, errorMessage: err });
      failureCount++;
      continue;
    }

    // Match variant for platform (or fallback to any available variant)
    const variant = variants.find((v: any) => v.platform === platform) || variants[0];
    const captionText = variant ? variant.caption : post.title || 'SocialSync AI Update';
    const hashtags = variant?.hashtags ? variant.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' ') : '';
    const fullText = hashtags ? `${captionText}\n\n${hashtags}` : captionText;

    // Check Manual Approval requirement: if in manual mode, verify variant approval
    if (post.publishing_mode === 'manual_approval' && variant && !variant.is_approved) {
      const err = `Manual approval required: Variant for ${platform} has not been approved.`;
      results.push({
        platform,
        success: false,
        errorMessage: err,
        actionRequired: 'Review and click Approve in Approval Center before publishing.',
      });
      failureCount++;
      continue;
    }

    try {
      // Decrypt stored access token
      const accessToken = decryptToken(account.encrypted_access_token);
      const adapter = getPlatformAdapter(platform);

      // Resolve signed or public URL for media if present
      let mediaUrl: string | undefined;
      if (media?.file_path) {
        if (media.file_path.startsWith('http')) {
          mediaUrl = media.file_path;
        } else {
          // Generate temporary signed download URL from Supabase Storage
          const { data: signedData } = await supabase.storage
            .from('media-assets')
            .createSignedUrl(media.file_path, 3600); // 1 hour validity for publishing
          mediaUrl = signedData?.signedUrl;
        }
      }

      // Execute publish through official platform adapter
      const publishResult = await adapter.publish({
        text: fullText,
        title: variant?.title || post.title || undefined,
        mediaUrl,
        mediaType: media?.media_type === 'video' ? 'video' : 'image',
        tags: variant?.hashtags || [],
        accessToken,
        accountId: account.external_account_id,
        metadata: account.metadata,
      });

      // Record immutable publishing attempt in database
      await supabase.from('publishing_attempts').insert({
        post_id: postId,
        social_account_id: account.id,
        platform,
        status: publishResult.success ? ('published' as PostStatus) : ('failed' as PostStatus),
        error_code: publishResult.errorCode || null,
        error_message: publishResult.errorMessage || null,
        external_post_id: publishResult.externalPostId || null,
        external_post_url: publishResult.externalPostUrl || null,
      });

      // Update target record
      await supabase
        .from('post_targets')
        .update({
          status: publishResult.success ? ('published' as PostStatus) : ('failed' as PostStatus),
          external_post_id: publishResult.externalPostId || null,
          external_post_url: publishResult.externalPostUrl || null,
          error_message: publishResult.errorMessage || null,
          published_at: publishResult.success ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', target.id);

      if (publishResult.success) {
        successCount++;
        results.push({
          platform,
          success: true,
          externalPostId: publishResult.externalPostId,
          externalPostUrl: publishResult.externalPostUrl,
        });
      } else {
        failureCount++;
        results.push({
          platform,
          success: false,
          errorMessage: publishResult.errorMessage,
          actionRequired: publishResult.actionRequired,
        });
      }
    } catch (err: any) {
      failureCount++;
      const errMsg = err.message || 'Unexpected publishing exception';

      await supabase.from('publishing_attempts').insert({
        post_id: postId,
        social_account_id: account.id,
        platform,
        status: 'failed' as PostStatus,
        error_message: errMsg,
      });

      await supabase
        .from('post_targets')
        .update({
          status: 'failed' as PostStatus,
          error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', target.id);

      results.push({
        platform,
        success: false,
        errorMessage: errMsg,
      });
    }
  }

  // Update final overall post status
  let finalStatus: PostStatus = 'published';
  if (successCount === 0 && failureCount > 0) {
    finalStatus = 'failed';
  } else if (failureCount > 0 && successCount > 0) {
    finalStatus = 'published'; // Partial success
  }

  await supabase
    .from('posts')
    .update({
      status: finalStatus,
      published_at: successCount > 0 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);

  // Send notification to user
  await supabase.from('notifications').insert({
    user_id: userId,
    title: finalStatus === 'published' ? 'Post Published Successfully' : 'Publishing Warning / Failure',
    message: `Post completed with ${successCount} published and ${failureCount} failed across connected channels.`,
    type: finalStatus === 'published' ? 'success' : 'error',
    link: `/dashboard/history?post=${postId}`,
  });

  return {
    postId,
    totalTargets: targets.length,
    successCount,
    failureCount,
    results,
  };
}
