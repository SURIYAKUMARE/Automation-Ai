/**
 * Browser-side image-to-video converter using HTML5 Canvas and MediaRecorder.
 * Generates an MP4/WebM video stream with 1080p resolution and a silent audio track,
 * conforming to YouTube Data API v3 upload requirements without server transcoding latency.
 */
export async function convertImageToVideo(
  imageFile: File,
  durationSeconds = 5
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const targetWidth = 1920;
        const targetHeight = 1080;
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Browser canvas context could not be initialized."));
          return;
        }

        // Letterbox on black background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const scale = Math.min(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        const x = (targetWidth - w) / 2;
        const y = (targetHeight - h) / 2;
        ctx.drawImage(img, x, y, w, h);

        const stream = canvas.captureStream(25);

        // Add silent audio track for maximum player and YouTube compatibility
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            const dest = audioCtx.createMediaStreamDestination();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            gain.gain.value = 0;
            osc.connect(gain);
            gain.connect(dest);
            osc.start();
            const track = dest.stream.getAudioTracks()[0];
            if (track) stream.addTrack(track);
          }
        } catch {
          // Silent audio track is optional fallback
        }

        let mimeType = "video/webm";
        if (typeof MediaRecorder !== "undefined") {
          if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")) {
            mimeType = "video/mp4;codecs=avc1";
          } else if (MediaRecorder.isTypeSupported("video/mp4")) {
            mimeType = "video/mp4";
          } else if (MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
            mimeType = "video/webm;codecs=h264";
          } else if (MediaRecorder.isTypeSupported("video/webm")) {
            mimeType = "video/webm";
          }
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        };

        recorder.onstop = () => {
          const baseMime = mimeType.split(";")[0];
          const ext = baseMime.includes("mp4") ? "mp4" : "webm";
          const blob = new Blob(chunks, { type: baseMime });
          const baseName = imageFile.name.replace(/\.[^/.]+$/, "");
          const convertedFile = new File([blob], `${baseName}-youtube.${ext}`, {
            type: baseMime,
            lastModified: Date.now(),
          });
          resolve(convertedFile);
        };

        recorder.start();

        const startTime = Date.now();
        const renderTimer = setInterval(() => {
          ctx.drawImage(img, x, y, w, h);
          if (Date.now() - startTime >= durationSeconds * 1000) {
            clearInterval(renderTimer);
            recorder.stop();
          }
        }, 40);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image for video conversion."));
    };

    img.src = url;
  });
}

/**
 * Automatically formats an image for Instagram, Facebook, and LinkedIn.
 * - Converts non-JPEG images (PNG, WebP, etc.) to high-quality JPEG (Meta Graph API requirement).
 * - Enforces Instagram's aspect ratio requirements (between 4:5 [0.8] and 1.91:1 [1.91]).
 * - Scales to standard social resolution (1080px width) preserving maximum quality.
 */
export async function formatImageForInstagram(imageFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        const ratio = naturalWidth / naturalHeight;

        // Instagram bounds: minimum 4:5 (0.8), maximum 1.91:1 (1.91)
        const MIN_RATIO = 0.8; // 4:5 portrait
        const MAX_RATIO = 1.91; // 1.91:1 landscape

        const isRatioValid = ratio >= MIN_RATIO && ratio <= MAX_RATIO;
        const isJpeg = imageFile.type === "image/jpeg";

        // If it's already a valid JPEG within aspect ratio limits, keep original file
        if (isRatioValid && isJpeg && naturalWidth <= 2048 && naturalHeight <= 2048) {
          resolve(imageFile);
          return;
        }

        let canvasWidth = naturalWidth;
        let canvasHeight = naturalHeight;

        if (ratio < MIN_RATIO) {
          // Too tall (e.g. 9:16 vertical) -> fit into 4:5 canvas (1080x1350)
          canvasWidth = 1080;
          canvasHeight = 1350;
        } else if (ratio > MAX_RATIO) {
          // Too wide (e.g. panorama) -> fit into 1.91:1 canvas (1080x565)
          canvasWidth = 1080;
          canvasHeight = Math.round(1080 / MAX_RATIO);
        } else if (canvasWidth > 1440) {
          // Scale down ultra-large images to crisp 1080p
          canvasWidth = 1080;
          canvasHeight = Math.round(1080 / ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context could not be initialized."));
          return;
        }

        // Fill background with neutral dark fill for letterbox/pillarbox
        ctx.fillStyle = "#0f172a"; // Tailwind Slate-900
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw image centered and contained
        const scale = Math.min(canvasWidth / naturalWidth, canvasHeight / naturalHeight);
        const drawWidth = naturalWidth * scale;
        const drawHeight = naturalHeight * scale;
        const drawX = (canvasWidth - drawWidth) / 2;
        const drawY = (canvasHeight - drawHeight) / 2;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Image formatting failed."));
              return;
            }
            const baseName = imageFile.name.replace(/\.[^/.]+$/, "");
            const formattedFile = new File([blob], `${baseName}-social.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(formattedFile);
          },
          "image/jpeg",
          0.92
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image for social formatting."));
    };

    img.src = url;
  });
}

