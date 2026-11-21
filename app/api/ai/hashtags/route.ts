import { authorizeAI } from '@/lib/ai/request';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSocialContentWithGemini } from '@/lib/ai/gemini';

const HashtagsSchema = z.object({
  topic: z.string().min(1),
  count: z.number().optional().default(10),
});

export async function POST(req: NextRequest) {
  const access = await authorizeAI(req);
  if (access.response) return access.response;
  try {
    const json = await req.json();
    const parsed = HashtagsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { topic } = parsed.data;
    const result = await generateSocialContentWithGemini({
      brand: access.brand,
      userPrompt: `Generate relevant hashtags for: ${topic}`,
    });

    const combined = Array.from(
      new Set([
        ...result.platforms.linkedin!.hashtags,
        ...result.platforms.instagram!.hashtags,
        ...result.platforms.facebook!.hashtags,
      ])
    );

    return NextResponse.json({
      success: true,
      topic,
      source: 'AI relevance',
      hashtags: combined.slice(0, parsed.data.count),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
