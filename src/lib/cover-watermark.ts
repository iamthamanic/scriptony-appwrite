/**
 * Composites the Scriptony logo onto generated cover art (bottom-right) for downloads/branding.
 * Location: src/lib/cover-watermark.ts
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("cover-watermark: image load failed"));
    img.src = src;
  });
}

/**
 * Draws cover pixels full-bleed, then the Scriptony logo bottom-right (scaled, slight transparency).
 * Output is always PNG for consistent quality.
 *
 * @param base64 Raw base64 from the image API (no data: prefix)
 * @param mimeType e.g. image/png or image/jpeg
 * @param logoSrc Bundled asset URL (Vite import of scriptony-logo.png)
 */
export async function applyScriptonyWatermarkToImageBase64(
  base64: string,
  mimeType: string,
  logoSrc: string
): Promise<Blob> {
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const [coverImg, logoImg] = await Promise.all([loadImage(dataUrl), loadImage(logoSrc)]);

  const w = coverImg.naturalWidth;
  const h = coverImg.naturalHeight;
  if (w < 2 || h < 2) {
    throw new Error("cover-watermark: invalid cover dimensions");
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("cover-watermark: canvas 2D unavailable");

  ctx.drawImage(coverImg, 0, 0, w, h);

  const pad = Math.max(8, Math.round(Math.min(w, h) * 0.022));
  const maxLogoW = w * 0.14;
  let lw = logoImg.naturalWidth;
  let lh = logoImg.naturalHeight;
  const scale = Math.min(maxLogoW / lw, 1);
  lw *= scale;
  lh *= scale;
  const x = w - lw - pad;
  const y = h - lh - pad;

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.drawImage(logoImg, x, y, lw, lh);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("cover-watermark: toBlob failed"));
      },
      "image/png",
      0.95
    );
  });
}
