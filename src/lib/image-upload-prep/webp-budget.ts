/**
 * WebP encoding with size budget: lossless first, then lossy qualities, then modest downscale.
 */

import { STORAGE_CONFIG } from "../config";
import { fileToImageData } from "./raster-decode";

function baseName(file: File): string {
  const n = file.name.trim() || "image";
  return n.replace(/\.[^./\\]+$/, "") || "image";
}

function toWebpFile(buffer: ArrayBuffer, sourceFile: File): File {
  const blob = new Blob([buffer], { type: "image/webp" });
  return new File([blob], `${baseName(sourceFile)}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

async function scaleImageData(
  source: ImageData,
  targetW: number,
  targetH: number,
): Promise<ImageData> {
  const bmp = await createImageBitmap(source);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas 2D nicht verfügbar");
    ctx.drawImage(bmp, 0, 0, targetW, targetH);
    return ctx.getImageData(0, 0, targetW, targetH);
  } finally {
    bmp.close();
  }
}

/**
 * Encode to WebP so output is ≤ maxBytes (default server limit). Tries lossless, then lossy steps, then scale.
 */
export async function rasterFileToWebpUnderMaxBytes(
  file: File,
  maxBytes: number = STORAGE_CONFIG.MAX_FILE_SIZE,
): Promise<File> {
  const { encode } = await import("@jsquash/webp");
  let imageData = await fileToImageData(file);

  const tryEncode = async (data: ImageData, opts: object) => {
    const buf = await encode(data, opts);
    return buf as ArrayBuffer;
  };

  // 1) Lossless
  let buffer = await tryEncode(imageData, { lossless: 1, exact: 1 });
  if (buffer.byteLength <= maxBytes) {
    return toWebpFile(buffer, file);
  }

  // 2) Lossy qualities
  const qualities = [92, 85, 78, 70, 62, 55, 48, 42, 36];
  for (const quality of qualities) {
    buffer = await tryEncode(imageData, {
      lossless: 0,
      quality,
      method: 6,
      alpha_quality: 100,
    });
    if (buffer.byteLength <= maxBytes) {
      return toWebpFile(buffer, file);
    }
  }

  // 3) Downscale progressively
  let w = imageData.width;
  let h = imageData.height;
  let scale = 0.9;
  while (scale > 0.35 && (w > 320 || h > 320)) {
    const nw = Math.max(1, Math.floor(w * scale));
    const nh = Math.max(1, Math.floor(h * scale));
    imageData = await scaleImageData(imageData, nw, nh);
    w = nw;
    h = nh;
    buffer = await tryEncode(imageData, {
      lossless: 0,
      quality: 78,
      method: 6,
      alpha_quality: 100,
    });
    if (buffer.byteLength <= maxBytes) {
      return toWebpFile(buffer, file);
    }
    scale *= 0.88;
  }

  throw new Error(
    `Bild konnte nicht unter ${(maxBytes / (1024 * 1024)).toFixed(0)} MB komprimiert werden.`,
  );
}
