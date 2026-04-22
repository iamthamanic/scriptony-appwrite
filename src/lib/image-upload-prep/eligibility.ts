/**
 * Which uploads use the client-side WebP pipeline (higher pre-prep size limit) and GIF confirmation rules.
 */

import { isImageWebpConversionEnabled } from "./pref";

export function isGifImage(file: File): boolean {
  return file.type.toLowerCase() === "image/gif";
}

export function isWebpImage(file: File): boolean {
  return file.type.toLowerCase() === "image/webp";
}

/** Lossless-first path: JPEG/PNG only (GIF/WebP handled separately in prepare). */
export function isEligibleForLosslessWebpConversion(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t === "image/webp") return false;
  if (t === "image/gif") return false;
  if (t === "image/svg+xml") return false;
  if (t === "image/jpeg" || t === "image/jpg" || t === "image/pjpeg")
    return true;
  if (t === "image/png") return true;
  return false;
}

/** True when the client may resize/re-encode so a larger original is allowed before upload. */
export function usesWebpPrepPipeline(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t === "image/svg+xml") return false;
  if (t === "image/jpeg" || t === "image/jpg" || t === "image/pjpeg")
    return true;
  if (t === "image/png") return true;
  if (t === "image/webp") return true;
  if (t === "image/gif") return isImageWebpConversionEnabled();
  return false;
}

/** Show GIF choice dialog when WebP preference is on (conversion would drop animation). */
export function needsGifUserConfirmation(file: File): boolean {
  return isGifImage(file) && isImageWebpConversionEnabled();
}
