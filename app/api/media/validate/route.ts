import { NextRequest, NextResponse } from 'next/server';

interface ValidationRequest {
  fileName?: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  platforms?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: ValidationRequest = await req.json();
    const { mimeType, sizeBytes, width, height, platforms = ['instagram', 'facebook', 'linkedin'] } = body;

    const errors: string[] = [];
    const warnings: string[] = [];

    const isVideo = mimeType.startsWith('video/');
    const isImage = mimeType.startsWith('image/');

    if (!isImage && !isVideo) {
      errors.push(`Unsupported MIME type: ${mimeType}. Supported types: image/jpeg, image/png, video/mp4, video/quicktime.`);
    }

    // Platform specific validations
    for (const platform of platforms) {
      if (platform === 'instagram') {
        if (isImage) {
          if (sizeBytes > 8 * 1024 * 1024) {
            errors.push('Instagram image exceeds 8MB limit.');
          }
          if (width && height) {
            const ratio = width / height;
            if (ratio < 0.79 || ratio > 1.92) {
              warnings.push(`Instagram aspect ratio (${ratio.toFixed(2)}) is outside recommended 4:5 (0.8) to 1.91:1 range.`);
            }
          }
        } else if (isVideo) {
          if (sizeBytes > 100 * 1024 * 1024) {
            errors.push('Instagram video exceeds 100MB limit for Graph API publish.');
          }
        }
      }

      if (platform === 'facebook') {
        if (isImage && sizeBytes > 10 * 1024 * 1024) {
          errors.push('Facebook image exceeds 10MB limit.');
        }
        if (isVideo && sizeBytes > 1024 * 1024 * 1024) {
          errors.push('Facebook video exceeds 1GB limit.');
        }
      }

      if (platform === 'linkedin') {
        if (isImage && sizeBytes > 8 * 1024 * 1024) {
          errors.push('LinkedIn image exceeds 8MB limit.');
        }
        if (isVideo && sizeBytes > 200 * 1024 * 1024) {
          errors.push('LinkedIn video exceeds 200MB limit for standard UGC API.');
        }
      }

      if (platform === 'youtube') {
        if (!isVideo) {
          errors.push('YouTube requires video format (MP4/MOV). Images are not supported.');
        }
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      isValid: errors.length === 0,
      errors,
      warnings,
      details: {
        fileType: isVideo ? 'video' : 'image',
        sizeFormatted: `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
        aspectRatio: width && height ? `${(width / height).toFixed(2)} (${width}x${height})` : 'unknown',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to validate media' },
      { status: 400 }
    );
  }
}
