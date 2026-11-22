import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { captionSchema, manageCampaign, postIdSchema } from '@/lib/publishing/campaign';
import { dispatchCampaign } from '@/lib/publishing/engine';
import { createAdminClient } from '@/lib/supabase/admin';

const Approval = z.object({
  action: z.enum(['approved', 'rejected', 'modified']),
  variantId: postIdSchema.optional(),
  approvedCaption: captionSchema.optional(),
  captions: z.record(postIdSchema, captionSchema).default({}),
  publishImmediately: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const input = Approval.safeParse(await req.json().catch(() => null));
  if (!postIdSchema.safeParse(id).success || !input.success) {
    return NextResponse.json({ error: 'Invalid approval request' }, { status: 400 });
  }
  const { action, variantId, approvedCaption, captions, publishImmediately } = input.data;
  if (variantId && approvedCaption) captions[variantId] = approvedCaption;
  if (Object.keys(captions).length > 4 || Object.values(captions).some((caption) => !caption)) {
    return NextResponse.json({ error: 'Supply a caption for each edited variant' }, { status: 400 });
  }
  const response = await manageCampaign(user.id, id, action, publishImmediately ? new Date().toISOString() : undefined, captions, variantId);
  if (response.ok && action === 'approved' && publishImmediately) {
    await dispatchCampaign(createAdminClient(), user.id, id);
  }
  return response;
}
