import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { executePostPublishing } from '@/lib/publishing/engine';
import { SocialPlatform } from '@/types';

const ApproveSchema = z.object({
  userId: z.string(),
  variantId: z.string().uuid().optional(),
  action: z.enum(['approved', 'rejected', 'modified']),
  approvedCaption: z.string().optional(),
  publishImmediately: z.boolean().optional().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    const json = await req.json();
    const parsed = ApproveSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid approval payload' }, { status: 400 });
    }

    const { userId, variantId, action, approvedCaption, publishImmediately } = parsed.data;
    const supabase = createAdminClient();

    // Verify post belongs to user
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .eq('user_id', userId)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ error: 'Post not found or unauthorized' }, { status: 404 });
    }

    if (variantId) {
      const updateData: any = {
        is_approved: action === 'approved' || action === 'modified',
        updated_at: new Date().toISOString(),
      };
      if (approvedCaption) {
        updateData.caption = approvedCaption;
      }

      await supabase.from('post_variants').update(updateData).eq('id', variantId);

      // Log in approvals table
      await supabase.from('approvals').insert({
        post_id: postId,
        user_id: userId,
        variant_id: variantId,
        platform: 'linkedin' as SocialPlatform, // variant's platform
        action,
        approved_caption: approvedCaption || null,
      });
    } else {
      // Approve all variants for this post
      await supabase
        .from('post_variants')
        .update({ is_approved: action === 'approved', updated_at: new Date().toISOString() })
        .eq('post_id', postId);

      await supabase.from('approvals').insert({
        post_id: postId,
        user_id: userId,
        platform: 'linkedin',
        action,
        notes: 'Bulk approved all platform variants',
      });
    }

    // Update overall post status
    await supabase
      .from('posts')
      .update({
        status: action === 'rejected' ? 'cancelled' : 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    // If user requested to publish immediately after approval
    if (publishImmediately && action !== 'rejected') {
      const summary = await executePostPublishing({
        postId,
        userId,
      });

      return NextResponse.json({
        success: true,
        message: 'Post approved and published.',
        summary,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Post ${action} successfully. Ready for scheduled or manual release.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Approval execution failed' }, { status: 500 });
  }
}
