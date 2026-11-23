import { createAdminClient, getSupabaseServerConfig } from '@/lib/supabase/admin';

export const mediaExtensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
};

export function mediaSizeLimit(mime: string) {
  return (mime.startsWith('image/') ? 15 : 100) * 1024 * 1024;
}

export function matchesMediaSignature(bytes: Buffer, mime: string) {
  if (bytes.length < 4) return false;
  if (mime === 'image/jpeg') return bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (mime === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === 'image/webp') return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (mime === 'video/webm') return bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
  if (mime === 'video/mp4' || mime === 'video/quicktime') {
    const headerStr = bytes.toString('ascii', 0, Math.min(128, bytes.length));
    return headerStr.includes('ftyp') || headerStr.includes('moov') || headerStr.includes('wide') || bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
  }
  return false;
}

export function isOwnedStoragePath(path: string, userId: string) {
  return path.startsWith(userId + '/') && /^[\w-]+\/[\w.-]+$/.test(path);
}

export async function signMedia(path: string, userId: string, expiresIn = 900) {
  const storedUrl = URL.parse(path);
  const storageOrigin = storedUrl && new URL(getSupabaseServerConfig().url).origin;
  const objectPath = storedUrl
    ? storedUrl.origin === storageOrigin && storedUrl.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/media-assets\/(.+)$/)?.[1]
    : path;
  if (!objectPath || !isOwnedStoragePath(objectPath, userId)) throw new Error('Media asset is outside the user storage folder');
  const { data, error } = await createAdminClient().storage.from('media-assets').createSignedUrl(objectPath, expiresIn);
  if (error || !data?.signedUrl) throw new Error('Stored media is unavailable');
  return data.signedUrl;
}
