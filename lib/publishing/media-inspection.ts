import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const maximumPixels = 40_000_000;

export class InvalidMediaError extends Error {}
export class MediaToolsError extends Error {}

export function resolveBinaryPath(name: 'ffmpeg' | 'ffprobe'): string {
  const envVar = name === 'ffmpeg' ? process.env.FFMPEG_PATH : process.env.FFPROBE_PATH;
  if (envVar) {
    const clean = envVar.replace(/^["']|["']$/g, '');
    if (existsSync(clean)) return clean;
  }
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? join(process.env.USERPROFILE, 'AppData', 'Local') : '');
    if (localAppData) {
      const tool = join(localAppData, 'SocialFlow', 'media-tools', '9.1', `${name}.exe`);
      if (existsSync(tool)) return tool;
    }
  }
  return name;
}

async function withLocalVideo<T>(bytes: Buffer, work: (file: string) => Promise<T>) {
  const folder = await mkdtemp(join(tmpdir(), 'socialflow-media-'));
  try {
    const file = join(folder, 'upload.bin');
    await writeFile(file, bytes);
    return await work(file);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

async function command(binary: string, args: string[], maxBuffer: number) {
  try {
    return (await run(binary, args, { encoding: 'buffer', timeout: 30_000, maxBuffer, windowsHide: true })).stdout;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new MediaToolsError('Video processing needs FFmpeg and FFprobe on the app server.');
    }
    throw new InvalidMediaError('The video could not be decoded. Try exporting it again.');
  }
}

async function probeVideo(file: string, mime: string) {
  const ffprobe = resolveBinaryPath('ffprobe');
  const stdout = await command(ffprobe, [
    '-v', 'error', '-protocol_whitelist', 'file', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,codec_name:format=duration,format_name', '-of', 'json', file,
  ], 100_000);
  const data = JSON.parse(stdout.toString());
  const video = data.streams?.[0];
  const duration = Number(data.format?.duration);
  const formats: string[] = data.format?.format_name?.split(',') ?? [];
  const expectedFormat = mime === 'video/webm' ? 'webm' : 'mp4';
  if (!video?.width || !video.height || video.width * video.height > maximumPixels ||
      !Number.isFinite(duration) || duration <= 0 || duration > 3600 || !formats.includes(expectedFormat)) {
    throw new InvalidMediaError('The file must contain a supported video stream of up to one hour.');
  }
  return { width: video.width as number, height: video.height as number, duration, codec: video.codec_name as string };
}

function frame(file: string, time: number) {
  const ffmpeg = resolveBinaryPath('ffmpeg');
  return command(ffmpeg, [
    '-nostdin', '-v', 'error', '-protocol_whitelist', 'file', '-ss', String(time), '-threads', '1', '-i', file,
    '-map', '0:v:0', '-vf', "scale='min(960,iw)':-2", '-frames:v', '1', '-threads', '1', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1',
  ], 3_000_000).then((bytes) => {
    if (!bytes.length) throw new InvalidMediaError('No picture could be extracted from the video.');
    return bytes;
  });
}

/**
 * Converts any static image into an official 30-second 1080p MP4 video using FFmpeg and FFprobe.
 * Includes a silent stereo AAC audio track conforming to YouTube Data API upload requirements.
 */
export async function generateVideoFromImageWithFFmpeg(
  imageBytes: Buffer,
  durationSeconds: number = 30
): Promise<{ videoBuffer: Buffer; duration: number; width: number; height: number }> {
  const folder = await mkdtemp(join(tmpdir(), 'socialflow-ffmpeg-'));
  try {
    const inputPath = join(folder, 'input_image.bin');
    const outputPath = join(folder, 'output_video.mp4');
    await writeFile(inputPath, imageBytes);

    const ffmpeg = resolveBinaryPath('ffmpeg');
    const ffprobe = resolveBinaryPath('ffprobe');

    await run(ffmpeg, [
      '-y',
      '-loop', '1',
      '-i', inputPath,
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-c:v', 'libx264',
      '-t', String(durationSeconds),
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
      '-c:a', 'aac',
      '-shortest',
      outputPath,
    ], { timeout: 60_000, windowsHide: true });

    // Validate with ffprobe
    const probeStdout = await run(ffprobe, [
      '-v', 'error',
      '-show_entries', 'format=duration:stream=width,height,codec_name',
      '-of', 'json',
      outputPath,
    ], { encoding: 'utf-8', timeout: 15_000, windowsHide: true });

    const probeData = JSON.parse(probeStdout.stdout);
    const duration = Number(probeData.format?.duration) || durationSeconds;
    const stream = probeData.streams?.[0];
    const width = stream?.width || 1920;
    const height = stream?.height || 1080;

    const videoBuffer = await readFile(outputPath);
    return { videoBuffer, duration, width, height };
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

/**
 * Auto-sizes an image into high-resolution PNG or JPEG conforming to Instagram, Facebook, and LinkedIn feed bounds.
 */
export async function autoSizeImage(
  imageBytes: Buffer,
  targetFormat: 'jpeg' | 'png' = 'jpeg',
  targetRatio: 'auto' | '1:1' | '4:5' | '1.91:1' = 'auto'
): Promise<{ buffer: Buffer; mime: string; width: number; height: number; format: string }> {
  const image = sharp(imageBytes, { limitInputPixels: maximumPixels }).rotate();
  const meta = await image.metadata();
  const naturalWidth = meta.width || 1080;
  const naturalHeight = meta.height || 1080;
  const currentRatio = naturalWidth / naturalHeight;

  let width = 1080;
  let height = 1080;

  if (targetRatio === '1:1') {
    width = 1080;
    height = 1080;
  } else if (targetRatio === '4:5') {
    width = 1080;
    height = 1350;
  } else if (targetRatio === '1.91:1') {
    width = 1080;
    height = 566;
  } else {
    // Auto ratio
    if (currentRatio < 0.85) {
      // Vertical / portrait -> 4:5 optimal for Instagram/Facebook feed
      width = 1080;
      height = 1350;
    } else if (currentRatio > 1.35) {
      // Horizontal / landscape -> 1.91:1
      width = 1080;
      height = Math.round(1080 / Math.min(1.91, currentRatio));
    } else {
      // Square
      width = 1080;
      height = 1080;
    }
  }

  const background = targetFormat === 'png' ? { r: 15, g: 23, b: 42, alpha: 0 } : { r: 15, g: 23, b: 42 };
  const resized = image.resize(width, height, {
    fit: 'contain',
    background,
  });

  if (targetFormat === 'png') {
    const buffer = await resized.png().toBuffer();
    return { buffer, mime: 'image/png', width, height, format: 'png' };
  } else {
    const buffer = await resized.jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
    return { buffer, mime: 'image/jpeg', width, height, format: 'jpeg' };
  }
}

export async function inspectUploadedMedia(bytes: Buffer, mime: string) {
  if (mime.startsWith('image/')) {
    try {
      const image = sharp(bytes, { limitInputPixels: maximumPixels, failOn: 'warning' });
      const details = await image.metadata();
      const formats: Record<string, string> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
      if (details.format !== formats[mime] || !details.width || !details.height) throw new Error('Invalid image metadata');
      const thumbnail = await image.rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).jpeg().toBuffer();
      const swapsAxes = (details.orientation ?? 0) >= 5;
      return { width: swapsAxes ? details.height : details.width, height: swapsAxes ? details.width : details.height,
        duration: null, codec: null, thumbnail };
    } catch {
      throw new InvalidMediaError('The image is corrupt or exceeds the supported image dimensions.');
    }
  }
  return withLocalVideo(bytes, async (file) => {
    const metadata = await probeVideo(file, mime);
    return { ...metadata, thumbnail: await frame(file, metadata.duration * 0.1) };
  });
}

export async function prepareStoredMedia(bytes: Buffer, mime: string) {
  if (mime.startsWith('image/')) {
    const mediaBuffer = await sharp(bytes, { limitInputPixels: maximumPixels }).rotate()
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    return { mediaBuffer, mimeType: 'image/jpeg' };
  }
  return withLocalVideo(bytes, async (file) => {
    const video = await probeVideo(file, mime);
    const mediaFrames: Buffer[] = [];
    for (const position of [0.04, 0.22, 0.4, 0.58, 0.76, 0.94]) {
      mediaFrames.push(await frame(file, position * video.duration));
    }
    return { mediaFrames, isMediaVideo: true };
  });
}
