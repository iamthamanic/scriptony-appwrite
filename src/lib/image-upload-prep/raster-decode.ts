/**
 * Decode raster image file to ImageData (first frame for GIF).
 */

const MAX_DIMENSION = 8192;

export async function fileToImageData(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  try {
    const w = bitmap.width;
    const h = bitmap.height;
    if (w < 1 || h < 1 || w > MAX_DIMENSION || h > MAX_DIMENSION) {
      throw new Error(`Bildabmessungen nicht unterstützt (${w}×${h})`);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      throw new Error('Canvas 2D nicht verfügbar');
    }
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    bitmap.close();
  }
}
