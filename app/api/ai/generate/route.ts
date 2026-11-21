import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSocialContentWithGemini } from '@/lib/ai/gemini';
import { authorizeAI } from '@/lib/ai/request';
import { platformSchema } from '@/lib/publishing/campaign';
import { matchesMediaSignature } from '@/lib/publishing/media';

const Generate = z.object({
  prompt: z.string().trim().max(4000).optional(),
  userPrompt: z.string().trim().max(4000).optional(),
  language: z.enum(['English', 'Tamil', 'Tanglish']).default('English'),
  tone: z.enum(['Professional', 'Friendly', 'Funny', 'Motivational', 'Educational', 'Marketing', 'Viral-style',
    'Creative', 'Minimal', 'Promotional']).default('Professional'),
  mediaBase64: z.string().max(4_000_000).optional(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
  isMediaVideo: z.boolean().default(false),
  targetPlatforms: z.array(platformSchema).min(1).max(4).optional(),
  alternatives: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const access = await authorizeAI(req);
  if (access.response) return access.response;
  if (Number(req.headers.get('content-length')) > 4_100_000) {
    return NextResponse.json({ error: 'AI preview exceeds the size limit' }, { status: 413 });
  }
  const request = Generate.safeParse(await req.json().catch(() => null));
  if (!request.success) return NextResponse.json({ error: 'Invalid generation request' }, { status: 400 });
  const { mediaBase64, mimeType, prompt, userPrompt, ...options } = request.data;
  const context = userPrompt || prompt;
  const bytes = mediaBase64 ? Buffer.from(mediaBase64.replace(/^data:[^;]+;base64,/, ''), 'base64') : undefined;
  if ((!context && !bytes) || (bytes && (!mimeType || !matchesMediaSignature(bytes, mimeType)))) {
    return NextResponse.json({ error: 'Add text context or a valid image or video preview' }, { status: 400 });
  }
  try {
    const data = await generateSocialContentWithGemini({
      ...options, userPrompt: context, mediaBuffer: bytes, mimeType, brand: access.brand,
    });
    return NextResponse.json({ success: true, data, variants: data.platforms, source: 'Gemini', hashtagSource: 'AI relevance' });
  } catch {
    return NextResponse.json({ error: 'Gemini could not generate captions. Verify the API configuration and quota, or try again.' }, { status: 502 });
  }
}
