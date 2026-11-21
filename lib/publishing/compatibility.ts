import type { SocialPlatform } from '@/types';

interface MediaDetails {
  mime_type: string;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  video_codec?: string | null;
}

export const captionLimits = { instagram: 2200, linkedin: 3000, youtube: 5000, facebook: 5000 };

export function mediaCompatibilityError(platform: SocialPlatform, media?: MediaDetails) {
  const mime = media?.mime_type;
  if (platform === 'youtube' && !mime?.startsWith('video/')) return 'YouTube requires a video.';
  if (platform === 'instagram') {
    if (!['image/jpeg', 'video/mp4', 'video/quicktime'].includes(mime || '')) return 'Instagram requires a JPEG, MP4 or MOV.';
    if (mime === 'image/jpeg' && media?.width && media.height) {
      const ratio = media.width / media.height;
      if (ratio < 0.8 || ratio > 1.91) return 'Instagram photos need an aspect ratio between 4:5 and 1.91:1.';
    }
    if (mime?.startsWith('video/') && media?.video_codec && !['h264', 'hevc'].includes(media.video_codec)) {
      return 'Instagram Reels require H.264 or HEVC video.';
    }
  }
  if (platform === 'linkedin' && mime && !['image/jpeg', 'image/png', 'video/mp4'].includes(mime)) {
    return 'LinkedIn requires JPEG, PNG or MP4 for media posts.';
  }
  return null;
}
