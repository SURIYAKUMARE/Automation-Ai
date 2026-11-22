import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSocialContent, MediaGroundingError } from '@/lib/ai/gemini';
import { authorizeAI } from '@/lib/ai/request';
import { platformSchema } from '@/lib/publishing/campaign';
import { matchesMediaSignature } from '@/lib/publishing/media';

export const maxDuration = 60;

const Generate = z.object({
  prompt: z.string().trim().max(4000).optional(),
  userPrompt: z.string().trim().max(4000).optional(),
  language: z.enum(['English', 'Tamil', 'Tanglish']).default('English'),
  tone: z.enum(['Professional', 'Friendly', 'Funny', 'Motivational', 'Educational', 'Marketing', 'Viral-style',
    'Creative', 'Minimal', 'Promotional']).default('Professional'),
  mediaBase64: z.string().max(4_000_000).optional(),
  mediaFrames: z.array(z.string().max(550_000)).min(2).max(6).optional(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
  isMediaVideo: z.boolean().default(false),
  targetPlatforms: z.array(platformSchema).min(1).max(4).optional(),
  alternatives: z.boolean().default(false),
  captionLength: z.enum(['short', 'standard', 'detailed']).optional(),
  hashtagLimit: z.number().int().min(0).max(30).optional(),
});

export async function POST(req: NextRequest) {
  const access = await authorizeAI(req);
  if (access.response) return access.response;
  if (Number(req.headers.get('content-length')) > 4_100_000) {
    return NextResponse.json({ error: 'AI preview exceeds the size limit' }, { status: 413 });
  }
  const request = Generate.safeParse(await req.json().catch(() => null));
  if (!request.success) return NextResponse.json({ error: 'Invalid generation request' }, { status: 400 });
  const { mediaBase64, mediaFrames, mimeType, prompt, userPrompt, ...options } = request.data;
  const context = userPrompt || prompt;
  const bytes = mediaBase64 ? Buffer.from(mediaBase64.replace(/^data:[^;]+;base64,/, ''), 'base64') : undefined;
  const frames = mediaFrames?.map((frame) => Buffer.from(frame.replace(/^data:image\/jpeg;base64,/, ''), 'base64'));
  if (options.isMediaVideo && (!frames || bytes) || frames && !options.isMediaVideo) {
    return NextResponse.json({ error: 'Video captioning requires frames from the uploaded clip' }, { status: 400 });
  }
  if ((!context && !bytes && !frames) || (bytes && (!mimeType || !matchesMediaSignature(bytes, mimeType))) ||
      frames?.some((frame) => !matchesMediaSignature(frame, 'image/jpeg'))) {
    return NextResponse.json({ error: 'Add text context or a valid image or video preview' }, { status: 400 });
  }
  try {
    const { source, ...data } = await generateSocialContent({
      ...options, userPrompt: context, mediaBuffer: bytes, mediaFrames: frames, mimeType, brand: access.brand,
    });
    return NextResponse.json({ success: true, data, variants: data.platforms, source, hashtagSource: 'AI relevance' });
  } catch (error) {
    if (error instanceof MediaGroundingError) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ error: 'Caption and title generation is unavailable. Check the AI provider configuration and quota, then try again.' }, { status: 502 });
  }
}
