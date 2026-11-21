import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const maximumPixels = 40_000_000;

export class InvalidMediaError extends Error {}
export class MediaToolsError extends Error {}

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
    return (await run(binary, args, { encoding: 'buffer', timeout: 15_000, maxBuffer, windowsHide: true })).stdout;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new MediaToolsError('Video processing needs FFmpeg and FFprobe on the app server.');
    }
    throw new InvalidMediaError('The video could not be decoded. Try exporting it again.');
  }
}

async function probeVideo(file: string, mime: string) {
  const stdout = await command(process.env.FFPROBE_PATH || 'ffprobe', [
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
  return command(process.env.FFMPEG_PATH || 'ffmpeg', [
    '-nostdin', '-v', 'error', '-protocol_whitelist', 'file', '-ss', String(time), '-threads', '1', '-i', file,
    '-map', '0:v:0', '-vf', "scale='min(960,iw)':-2", '-frames:v', '1', '-threads', '1', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1',
  ], 3_000_000).then((bytes) => {
    if (!bytes.length) throw new InvalidMediaError('No picture could be extracted from the video.');
    return bytes;
  });
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
