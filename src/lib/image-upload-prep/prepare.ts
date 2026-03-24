/**
 * Single entry for image uploads: WebP budget, optional lossless JPEG/PNG, explicit GIF modes.
 */

import { STORAGE_CONFIG } from '../config';
import { isImageWebpConversionEnabled } from './pref';
import {
  isEligibleForLosslessWebpConversion,
  isGifImage,
  isWebpImage,
} from './eligibility';
import { rasterFileToLosslessWebpFile } from './to-lossless-webp';
import { rasterFileToWebpUnderMaxBytes } from './webp-budget';
import type { ImageUploadGifMode } from './types';

export class GifUploadChoiceRequiredError extends Error {
  constructor() {
    super('GIF_UPLOAD_CHOICE_REQUIRED');
    this.name = 'GifUploadChoiceRequiredError';
  }
}

export type PrepareImageFileOptions = {
  gifMode?: ImageUploadGifMode;
};

export async function prepareImageFileForUpload(
  file: File,
  options?: PrepareImageFileOptions
): Promise<File> {
  const pref = isImageWebpConversionEnabled();
  const maxBytes = STORAGE_CONFIG.MAX_FILE_SIZE;

  if (isWebpImage(file)) {
    const over = file.size > maxBytes;
    if (over || pref) {
      try {
        return await rasterFileToWebpUnderMaxBytes(file, maxBytes);
      } catch (e) {
        if (over) throw e;
        console.warn('[image-upload-prep] WebP re-encode skipped, using original', e);
        return file;
      }
    }
    return file;
  }

  if (isGifImage(file) && pref) {
    if (!options?.gifMode) {
      throw new GifUploadChoiceRequiredError();
    }
    if (options.gifMode === 'keep-animation') {
      return file;
    }
    return await rasterFileToWebpUnderMaxBytes(file, maxBytes);
  }

  if (isGifImage(file) && !pref) {
    return file;
  }

  if (isEligibleForLosslessWebpConversion(file)) {
    const overBudget = file.size > maxBytes;
    console.debug('[image-upload-prep] JPEG/PNG path', {
      name: file.name,
      size: file.size,
      type: file.type,
      pref,
      overBudget,
      maxBytes,
    });
    if (!pref && !overBudget) {
      return file;
    }
    if (pref) {
      try {
        const lossless = await rasterFileToLosslessWebpFile(file);
        console.debug('[image-upload-prep] Lossless WebP OK', lossless.size);
        return lossless;
      } catch (err) {
        console.warn('[image-upload-prep] Lossless WebP failed, trying budget encode', err);
      }
    }
    // Budget encode: either lossless failed, or file exceeds server upload limit
    try {
      const budgeted = await rasterFileToWebpUnderMaxBytes(file, maxBytes);
      console.debug('[image-upload-prep] Budget WebP OK', budgeted.size);
      return budgeted;
    } catch (e2) {
      console.error('[image-upload-prep] Budget WebP FAILED:', e2);
      if (overBudget) {
        throw new Error(
          `Bild konnte nicht auf unter ${(maxBytes / 1024 / 1024).toFixed(0)} MB komprimiert werden. WebP-Encoder-Fehler: ${e2 instanceof Error ? e2.message : e2}`
        );
      }
      return file;
    }
  }

  return file;
}
