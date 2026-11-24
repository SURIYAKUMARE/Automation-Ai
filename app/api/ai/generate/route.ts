import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSocialContent, MediaGroundingError } from '@/lib/ai/gemini';
import { authorizeAI } from '@/lib/ai/request';
import { platformSchema } from '@/lib/publishing/campaign';
import { matchesMediaSignature } from '@/lib/publishing/media';

export const maxDuration = 60;

const aiPlatformSchema = z.enum(['linkedin', 'youtube', 'instagram', 'facebook', 'whatsapp']);

const Generate = z.object({
  prompt: z.string().trim().max(4000).optional(),
  userPrompt: z.string().trim().max(4000).optional(),
  language: z.enum(['English', 'Tamil', 'Tanglish']).default('English'),
  tone: z.enum(['Professional', 'Friendly', 'Funny', 'Motivational', 'Educational', 'Marketing', 'Viral-style',
    'Creative', 'Minimal', 'Promotional']).default('Professional'),
  mediaBase64: z.string().max(6_000_000).optional(),
  mediaFrames: z.array(z.string().max(1_200_000)).min(1).max(6).optional(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
  isMediaVideo: z.boolean().default(false),
  targetPlatforms: z.array(aiPlatformSchema).min(1).max(5).optional(),
  alternatives: z.boolean().default(false),
  captionLength: z.enum(['short', 'standard', 'detailed']).optional(),
  hashtagLimit: z.number().int().min(0).max(30).optional(),
});

export async function POST(req: NextRequest) {
  const access = await authorizeAI(req);
  if (access.response) return access.response;
  if (Number(req.headers.get('content-length')) > 10_000_000) {
    return NextResponse.json({ error: 'AI preview exceeds the size limit' }, { status: 413 });
  }
  const request = Generate.safeParse(await req.json().catch(() => null));
  if (!request.success) return NextResponse.json({ error: 'Invalid generation request' }, { status: 400 });
  const { mediaBase64, mediaFrames, mimeType, prompt, userPrompt, ...options } = request.data;
  let context = userPrompt || prompt;
  if (!context) {
    context = options.isMediaVideo
      ? 'Create an engaging video title, description, and hashtags for social channels'
      : (mediaBase64 || mimeType)
      ? 'Create an engaging photo caption, title, and hashtags for social channels'
      : 'Create an engaging social media post with title, caption, and hashtags';
  }
  const bytes = (mediaBase64 && (!options.isMediaVideo)) ? Buffer.from(mediaBase64.replace(/^data:[^;]+;base64,/, ''), 'base64') : undefined;
  const validBytes = bytes && mimeType && matchesMediaSignature(bytes, mimeType) ? bytes : undefined;
  const frames = mediaFrames?.map((frame) => Buffer.from(frame.replace(/^data:image\/jpeg;base64,/, ''), 'base64'));
  const validFrames = frames?.filter((frame) => matchesMediaSignature(frame, 'image/jpeg'));
  try {
    const { source, ...data } = await generateSocialContent({
      ...options, userPrompt: context, mediaBuffer: validBytes, mediaFrames: validFrames?.length ? validFrames : undefined, mimeType: validBytes ? mimeType : undefined,
      brand: validBytes && !context ? null : access.brand,
    });
    return NextResponse.json({ success: true, data, variants: data.platforms, source, hashtagSource: 'AI relevance' });
  } catch (error) {
    if (error instanceof MediaGroundingError) return NextResponse.json({ error: error.message }, { status: 422 });
    const message = error instanceof Error ? error.message : 'Caption and title generation is unavailable. Check the AI provider configuration and quota, then try again.';
    console.error('AI generation failure:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
