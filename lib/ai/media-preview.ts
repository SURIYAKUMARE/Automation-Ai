export async function prepareMediaPreview(file: File) {
  const url = URL.createObjectURL(file);
  const isMediaVideo = file.type.startsWith('video/');
  const canvas = document.createElement('canvas');
  let video: HTMLVideoElement | undefined;
  try {
    let source: HTMLImageElement | HTMLVideoElement;
    let width: number;
    let height: number;
    if (isMediaVideo) {
      video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Video preview could not be prepared')), 8000);
        video!.onloadeddata = () => { window.clearTimeout(timeout); resolve(); };
        video!.onerror = () => { window.clearTimeout(timeout); reject(new Error('This browser cannot preview the video')); };
        video!.src = url;
      });
      source = video;
      width = video.videoWidth;
      height = video.videoHeight;
    } else {
      const image = new Image();
      image.src = url;
      await image.decode();
      source = image;
      width = image.naturalWidth;
      height = image.naturalHeight;
    }
    if (!width || !height) throw new Error('The selected file has no visual preview');
    const scale = Math.min(1, 1600 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The browser could not prepare a media preview');
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return { mediaBase64: canvas.toDataURL('image/jpeg', 0.86), mimeType: 'image/jpeg', isMediaVideo };
  } finally {
    if (video) {
      video.removeAttribute('src');
      video.load();
    }
    URL.revokeObjectURL(url);
  }
}
