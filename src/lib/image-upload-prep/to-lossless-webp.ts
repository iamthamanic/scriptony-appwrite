/**
 * Raster image → lossless WebP (WASM @jsquash/webp). Browser-only.
 */

import { STORAGE_CONFIG } from '../config';
import { fileToImageData } from './raster-decode';

function baseName(file: File): string {
  const n = file.name.trim() || 'image';
  return n.replace(/\.[^./\\]+$/, '') || 'image';
}

/**
 * Encode with WebP lossless + exact alpha (libwebp semantics).
 */
export async function rasterFileToLosslessWebpFile(file: File): Promise<File> {
  const imageData = await fileToImageData(file);
  const { encode } = await import('@jsquash/webp');
  const buffer = await encode(imageData, { lossless: 1, exact: 1 });
  const blob = new Blob([buffer], { type: 'image/webp' });
  const out = new File([blob], `${baseName(file)}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  });

  if (out.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
    throw new Error(
      `WebP nach Konvertierung zu groß (${(out.size / 1024 / 1024).toFixed(2)} MB)`
    );
  }

  return out;
}
