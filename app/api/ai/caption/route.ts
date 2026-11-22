import { authorizeAI } from '@/lib/ai/request';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSocialContent } from '@/lib/ai/gemini';
import { SupportedLanguage, SupportedTone } from '@/types';

const CaptionSchema = z.object({
  topic: z.string().min(1),
  platform: z.enum(['linkedin', 'instagram', 'facebook', 'youtube']).default('linkedin'),
  language: z.enum(['English', 'Tamil', 'Tanglish']).default('English'),
  tone: z.enum(['Professional', 'Friendly', 'Creative', 'Educational', 'Minimal', 'Promotional']).default('Professional'),
});

export async function POST(req: NextRequest) {
  const access = await authorizeAI(req);
  if (access.response) return access.response;
  try {
    const json = await req.json();
    const parsed = CaptionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { topic, platform, language, tone } = parsed.data;

    const result = await generateSocialContent({
      brand: access.brand,
      userPrompt: topic,
      language: language as SupportedLanguage,
      tone: tone as SupportedTone,
    });

    const platformVariant = result.platforms[platform] ?? result.platforms.linkedin!;

    return NextResponse.json({
      success: true,
      platform,
      caption: platformVariant.caption,
      hashtags: platformVariant.hashtags,
      characterCount: platformVariant.character_count,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
