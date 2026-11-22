import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSocialContent } from '@/lib/ai/gemini';

const PostIdeasSchema = z.object({
  niche: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = PostIdeasSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { niche } = parsed.data;
    const result = await generateSocialContent({
      userPrompt: `Generate 5 creative, high-engagement post concepts and hooks for the niche: ${niche}`,
    });

    const ideas = [
      {
        id: 'idea_1',
        title: `The Future of ${niche}: 3 Contrarian Predictions`,
        hook: `Why most teams in ${niche} are preparing for the wrong wave...`,
        suggestedPlatform: 'linkedin',
      },
      {
        id: 'idea_2',
        title: `Behind the Scenes: Building in ${niche}`,
        hook: `Real architecture decisions, zero fluff. Here is what we learned...`,
        suggestedPlatform: 'instagram',
      },
      {
        id: 'idea_3',
        title: `5 Tools Changing ${niche} Workflows Today`,
        hook: `Stop doing this manually in 2026. Automated solutions that actually deliver.`,
        suggestedPlatform: 'facebook',
      },
      {
        id: 'idea_4',
        title: `System Architecture Walkthrough for ${niche}`,
        hook: `End-to-end technical demonstration: from concept to production.`,
        suggestedPlatform: 'youtube',
      },
      {
        id: 'idea_5',
        title: `Community Poll: Biggest Bottleneck in ${niche}?`,
        hook: `We asked 100 professionals in ${niche}. The top answer was surprising.`,
        suggestedPlatform: 'linkedin',
      },
    ];

    return NextResponse.json({
      success: true,
      niche,
      ideas,
      detectedTopics: result.topics,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
