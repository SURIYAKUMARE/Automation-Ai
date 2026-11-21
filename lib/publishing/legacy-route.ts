import { NextRequest, NextResponse } from 'next/server';
import { POST as createPost } from '@/app/api/posts/create/route';
import { SocialPlatform } from '@/types';

export async function publishPlatform(req: NextRequest, platform: SocialPlatform) {
  const input = await req.json().catch(() => null);
  if (!input || typeof input !== 'object' || input.mediaUrl || input.mediaBase64 || input.imageUrl || input.videoUrl) {
    return NextResponse.json({ error: 'Attach media by uploading it and providing mediaAssetId' }, { status: 400 });
  }
  const request = new NextRequest(req.url, {
    method: 'POST', headers: req.headers,
    body: JSON.stringify({
      mediaAssetId: input.mediaAssetId, requestId: input.requestId, title: input.title,
      publishingMode: 'automatic', targetPlatforms: [platform],
      variants: [{
        platform, title: input.title, caption: input.caption || input.text || input.message || input.description || input.title,
        hashtags: Array.isArray(input.hashtags) ? input.hashtags : input.tags,
      }],
    }),
  });
  return createPost(request);
}
