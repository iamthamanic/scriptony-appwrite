/**
 * User preference: lossless WebP conversion before image uploads (localStorage).
 */

import { STORAGE_KEYS } from '../config';

const DEFAULT_ENABLED = true;

function readRaw(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.IMAGE_UPLOAD_LOSSLESS_WEBP);
}

export function isImageWebpConversionEnabled(): boolean {
  const v = readRaw();
  if (v === null) return DEFAULT_ENABLED;
  return v === '1' || v === 'true';
}

export function setImageWebpConversionEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.IMAGE_UPLOAD_LOSSLESS_WEBP, enabled ? '1' : '0');
}
