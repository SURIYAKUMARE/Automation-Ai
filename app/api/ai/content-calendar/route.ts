import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateWeeklyPlan } from '@/lib/ai/gemini';
import { authorizeAI } from '@/lib/ai/request';

const Plan = z.object({ theme: z.string().trim().min(1).max(500), days: z.number().int().min(1).max(7).default(7) });

export async function POST(req: NextRequest) {
  const access = await authorizeAI(req);
  if (access.response) return access.response;
  const input = Plan.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Provide a theme and one to seven days' }, { status: 400 });
  try {
    const { theme, days } = input.data;
    const schedule = await generateWeeklyPlan(theme, days, access.brand);
    return NextResponse.json({ success: true, theme, schedule, source: 'Gemini suggestions' });
  } catch {
    return NextResponse.json({ error: 'Could not generate the content plan' }, { status: 502 });
  }
}
