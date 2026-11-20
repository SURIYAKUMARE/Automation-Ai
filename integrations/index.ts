import { SocialPlatform } from '@/types';
import { PlatformAdapter } from './types';
import { LinkedInAdapter } from './linkedin/linkedin.adapter';
import { YouTubeAdapter } from './youtube/youtube.adapter';
import { InstagramAdapter } from './instagram/instagram.adapter';
import { FacebookAdapter } from './facebook/facebook.adapter';

const adapters: Record<SocialPlatform, PlatformAdapter> = {
  linkedin: new LinkedInAdapter(),
  youtube: new YouTubeAdapter(),
  instagram: new InstagramAdapter(),
  facebook: new FacebookAdapter(),
};

export function getPlatformAdapter(platform: SocialPlatform): PlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`Unsupported social platform: ${platform}`);
  }
  return adapter;
}

export * from './types';
