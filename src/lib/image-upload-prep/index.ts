/**
 * Image upload preparation (preferences + WebP). Used by API upload helpers.
 */

export {
  isImageWebpConversionEnabled,
  setImageWebpConversionEnabled,
} from './pref';
export {
  isEligibleForLosslessWebpConversion,
  isGifImage,
  isWebpImage,
  needsGifUserConfirmation,
  usesWebpPrepPipeline,
} from './eligibility';
export type { ImageUploadGifMode } from './types';
export {
  prepareImageFileForUpload,
  GifUploadChoiceRequiredError,
} from './prepare';
export type { PrepareImageFileOptions } from './prepare';
