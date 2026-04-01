/**
 * Derived state for Image provider cards: global image feature switches + per-feature provider assignment.
 * Location: src/hooks/useAiImageProviderFeatureToggles.ts
 */

import { useMemo, useCallback } from "react";
import {
  getEffectiveImageProviderForFeature,
  getImageFeatureFlags,
  getRoutedImageProviderForFeature,
  IMAGE_ROUTABLE_FEATURES,
  type AiImageRoutingParsed,
  type ImageFeatureId,
  type ImageProviderId,
} from "../lib/ai-image-feature-routing";

export type AiSettingsWithImageRouting = {
  settings_json_parsed?: AiImageRoutingParsed | null;
};

export function useAiImageProviderFeatureToggles(settings: AiSettingsWithImageRouting | null) {
  const parsed = settings?.settings_json_parsed ?? undefined;

  const featureFlags = useMemo(() => getImageFeatureFlags(parsed), [parsed]);

  /** Toggle „an“ wenn dieses Feature global an ist und effektiv diesem Image-Provider zugeordnet (explizit oder Legacy-Fallback). */
  const isOnForProvider = useCallback(
    (providerId: ImageProviderId, fid: ImageFeatureId) =>
      Boolean(featureFlags[fid] && getEffectiveImageProviderForFeature(parsed, fid) === providerId),
    [featureFlags, parsed]
  );

  return {
    routableImageFeatures: IMAGE_ROUTABLE_FEATURES,
    featureFlags,
    isOnForProvider,
    getRoutedImageProviderForFeature: (fid: ImageFeatureId) => getRoutedImageProviderForFeature(parsed, fid),
    getEffectiveImageProviderForFeature: (fid: ImageFeatureId) => getEffectiveImageProviderForFeature(parsed, fid),
  };
}

export type { ImageFeatureId, ImageProviderId };
