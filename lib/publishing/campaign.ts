import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { socialPlatforms } from '@/lib/auth/social-oauth';

export const postIdSchema = z.string().uuid();
export const platformSchema = z.enum(socialPlatforms);
export const captionSchema = z.string().trim().max(5000);

export async function manageCampaign(ownerId: string, campaignId: string, operation: string,
  runTime?: string, edits: Record<string, string> = {}, variantId?: string) {
  const { data, error } = await createAdminClient().rpc('manage_campaign', {
    owner_id: ownerId, campaign_id: campaignId, operation,
    run_time: runTime ?? null, edits, variant_id: variantId ?? null,
  });
  if (error) return NextResponse.json({ error: 'Could not update the post' }, { status: 503 });
  if (!data?.id) return NextResponse.json({ error: 'This post is unavailable or cannot make that transition' }, { status: 409 });
  return NextResponse.json({ success: true, post: data });
}
