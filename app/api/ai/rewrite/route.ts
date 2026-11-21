import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSocialContentWithGemini } from '@/lib/ai/gemini';
import { SupportedTone } from '@/types';

const RewriteSchema = z.object({
  text: z.string().min(1),
  tone: z.enum(['Professional', 'Friendly', 'Creative', 'Educational', 'Minimal', 'Promotional']).default('Professional'),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = RewriteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { text, tone } = parsed.data;
    const result = await generateSocialContentWithGemini({
      userPrompt: `Rewrite this post text with high impact and a ${tone} tone: "${text}"`,
      tone: tone as SupportedTone,
    });

    return NextResponse.json({
      success: true,
      originalText: text,
      targetTone: tone,
      rewrittenCaption: result.platforms.linkedin.caption,
      hashtags: result.platforms.linkedin.hashtags,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
