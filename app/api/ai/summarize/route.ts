import { authorizeAI } from '@/lib/ai/request';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSocialContent } from '@/lib/ai/gemini';

const SummarizeSchema = z.object({
  content: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const access = await authorizeAI(req);
  if (access.response) return access.response;
  try {
    const json = await req.json();
    const parsed = SummarizeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    const { content } = parsed.data;
    const result = await generateSocialContent({
      brand: access.brand,
      userPrompt: `Summarize this text into a concise, high-impact social media takeaway:\n\n${content}`,
    });

    return NextResponse.json({
      success: true,
      summary: result.summary,
      keyTakeaways: result.topics,
      socialPost: result.platforms.linkedin!.caption,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
