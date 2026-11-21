const photoBudget = 3_800_000;
const frameBudget = 550_000;
const samplePoints = [0.04, 0.22, 0.4, 0.58, 0.76, 0.94];

function makeImagePreview(source: CanvasImageSource, width: number, height: number, size: number, budget: number) {
  if (!width || !height) throw new Error('The selected file has no readable image');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The browser could not prepare the media');
  for (let maxSize = size; maxSize >= 320; maxSize = Math.floor(maxSize * 0.75)) {
    const scale = Math.min(1, maxSize / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/jpeg', 0.88);
    if (image.length <= budget && image.startsWith('data:image/jpeg;')) return image;
  }
  throw new Error('This media could not be converted to a readable preview');
}

function waitForVideo(video: HTMLVideoElement, event: 'loadeddata' | 'seeked', start: () => void) {
  return new Promise<void>((resolve, reject) => {
    function finish(error?: Error) {
      window.clearTimeout(timeout);
      video.removeEventListener(event, onReady);
      video.removeEventListener('error', onError);
      if (error) reject(error);
      else resolve();
    }
    const onReady = () => finish();
    const onError = () => finish(new Error('The browser cannot read this video. Try an MP4 or WebM export.'));
    const timeout = window.setTimeout(() => finish(new Error('The browser timed out while reading the video')), 8000);
    video.addEventListener(event, onReady);
    video.addEventListener('error', onError);
    try { start(); } catch { onError(); }
  });
}

export async function prepareMediaPreview(file: Blob, isVideo = file.type.startsWith('video/')) {
  const url = URL.createObjectURL(file);
  let video: HTMLVideoElement | undefined;
  try {
    if (!isVideo) {
      const image = new Image();
      image.src = url;
      await image.decode().catch(() => { throw new Error('The browser cannot read this photo. Try a JPEG, PNG or WebP export.'); });
      return { mediaBase64: makeImagePreview(image, image.naturalWidth, image.naturalHeight, 2400, photoBudget), mimeType: 'image/jpeg' };
    }

    const clip = document.createElement('video');
    video = clip;
    clip.preload = 'auto';
    clip.muted = true;
    clip.playsInline = true;
    await waitForVideo(clip, 'loadeddata', () => { clip.src = url; });
    // Some recorded WebM files omit duration in the container header.
    if (!Number.isFinite(clip.duration)) await waitForVideo(clip, 'seeked', () => { clip.currentTime = 1e10; });
    const duration = Number.isFinite(clip.duration) ? clip.duration : clip.currentTime;
    if (duration <= 0) throw new Error('The video has no readable duration. Try exporting it again.');

    const frames: string[] = [];
    for (const point of samplePoints) {
      const time = duration * point;
      if (Math.abs(clip.currentTime - time) > 0.001) {
        await waitForVideo(clip, 'seeked', () => { clip.currentTime = time; });
      }
      frames.push(makeImagePreview(clip, clip.videoWidth, clip.videoHeight, 960, frameBudget));
    }
    return { mediaFrames: frames, isMediaVideo: true };
  } finally {
    if (video) {
      video.removeAttribute('src');
      video.load();
    }
    URL.revokeObjectURL(url);
  }
}
