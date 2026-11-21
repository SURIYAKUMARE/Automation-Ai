import { NextRequest, NextResponse } from 'next/server';
import { completeSocial, socialPlatforms } from '@/lib/auth/social-oauth';
import { SocialPlatform } from '@/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const platform = (await params).platform as SocialPlatform;
  return socialPlatforms.includes(platform)
    ? completeSocial(req, platform)
    : NextResponse.json({ error: 'Unsupported platform' }, { status: 404 });
}
