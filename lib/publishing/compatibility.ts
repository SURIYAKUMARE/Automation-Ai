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

  // YouTube strictly requires a video
  if (platform === 'youtube') {
    if (!media) return 'YouTube requires a video file (MP4, MOV).';
    if (!mime?.startsWith('video/')) return 'YouTube requires a video (MP4, MOV, WEBM). Static photos cannot be uploaded directly to YouTube.';
    return null;
  }

  // Instagram requires a photo or video
  if (platform === 'instagram') {
    if (!media) return 'Instagram requires an uploaded photo (JPEG, PNG) or video (MP4, MOV).';
    if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'].includes(mime || '')) {
      return 'Instagram requires a photo (JPEG, PNG) or video (MP4, MOV).';
    }
    if (mime?.startsWith('video/') && media?.video_codec && !['h264', 'hevc'].includes(media.video_codec)) {
      return 'Instagram Reels require H.264 or HEVC video.';
    }
    return null;
  }

  // LinkedIn allows text posts, photos (JPEG, PNG, WebP), or video (MP4)
  if (platform === 'linkedin' && mime) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(mime)) {
      return 'LinkedIn requires a photo (JPEG, PNG) or video (MP4).';
    }
  }

  // Facebook allows text posts, photos (JPEG, PNG, WebP), or video (MP4, MOV)
  if (platform === 'facebook' && mime) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'].includes(mime)) {
      return 'Facebook requires a photo (JPEG, PNG) or video (MP4, MOV).';
    }
  }

  return null;
}
