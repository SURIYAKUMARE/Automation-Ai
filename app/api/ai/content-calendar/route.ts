import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSocialContentWithGemini } from '@/lib/ai/gemini';

const CalendarSchema = z.object({
  theme: z.string().min(1),
  days: z.number().optional().default(7),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = CalendarSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { theme } = parsed.data;

    const days = [
      { day: 'Monday', focus: 'Product / Architectural Milestone', targetPlatform: 'linkedin', time: '09:00 AM UTC' },
      { day: 'Tuesday', focus: 'Visual System Diagram / Poster', targetPlatform: 'instagram', time: '02:00 PM UTC' },
      { day: 'Wednesday', focus: 'Engineering Deep Dive & Tips', targetPlatform: 'linkedin', time: '11:00 AM UTC' },
      { day: 'Thursday', focus: 'Community Q&A / Discussion Prompt', targetPlatform: 'facebook', time: '04:00 PM UTC' },
      { day: 'Friday', focus: 'Video Walkthrough & Technical Reel', targetPlatform: 'youtube', time: '01:00 PM UTC' },
      { day: 'Saturday', focus: 'Design Highlights & Google Stitch Aesthetics', targetPlatform: 'instagram', time: '10:00 AM UTC' },
      { day: 'Sunday', focus: 'Weekly Retrospective & Milestone Metrics', targetPlatform: 'linkedin', time: '05:00 PM UTC' },
    ];

    return NextResponse.json({
      success: true,
      theme,
      schedule: days.map((d, index) => ({
        ...d,
        id: `cal_event_${index + 1}`,
        suggestedTitle: `${theme}: ${d.focus}`,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
