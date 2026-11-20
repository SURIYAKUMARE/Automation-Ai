import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSocialContentWithGemini } from '@/lib/ai/gemini';
import { SupportedLanguage, SupportedTone } from '@/types';

const GenerateRequestSchema = z.object({
  userPrompt: z.string().optional(),
  prompt: z.string().optional(),
  language: z.enum(['English', 'Tamil', 'Tanglish']).default('English'),
  tone: z.enum(['Professional', 'Friendly', 'Creative', 'Educational', 'Minimal', 'Promotional']).default('Professional'),
  mediaBase64: z.string().optional(),
  mimeType: z.string().optional(),
  isMediaVideo: z.boolean().optional().default(false),
  targetPlatforms: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = GenerateRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { userPrompt, prompt, language, tone, mediaBase64, mimeType, isMediaVideo } = parsed.data;
    const effectivePrompt = userPrompt || prompt || '';

    let mediaBuffer: Buffer | undefined;
    if (mediaBase64) {
      // Strip data:image/png;base64, prefix if included
      const cleaned = mediaBase64.replace(/^data:[^;]+;base64,/, '');
      mediaBuffer = Buffer.from(cleaned, 'base64');
    }

    const result = await generateSocialContentWithGemini({
      mediaBuffer,
      mimeType,
      userPrompt: effectivePrompt,
      language: language as SupportedLanguage,
      tone: tone as SupportedTone,
      isMediaVideo,
    });

    return NextResponse.json({
      success: true,
      data: result,
      variants: result.platforms,
    });
  } catch (err: any) {
    console.error('API /api/ai/generate error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error generating AI captions' },
      { status: 500 }
    );
  }
}
