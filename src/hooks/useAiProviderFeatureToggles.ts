/**
 * Derived state for AI provider cards: global feature switches + per-feature provider assignment.
 * Uses AI_ROUTABLE_FEATURES from lib — new providers need no extra hook logic.
 * Location: src/hooks/useAiProviderFeatureToggles.ts
 */

import { useMemo, useCallback } from "react";
import type { LlmProviderId } from "../lib/llm-provider-registry";
import {
  AI_ROUTABLE_FEATURES,
  getAiFeatureFlags,
  getRoutedProviderForFeature,
  type AiFeatureId,
  type AiFeatureRoutingParsed,
} from "../lib/ai-feature-routing";

export type AiSettingsWithRouting = {
  settings_json_parsed?: AiFeatureRoutingParsed | null;
};

export function useAiProviderFeatureToggles(
  settings: AiSettingsWithRouting | null,
) {
  const parsed = settings?.settings_json_parsed ?? undefined;

  const featureFlags = useMemo(() => getAiFeatureFlags(parsed), [parsed]);

  const isAssignedToProvider = useCallback(
    (providerId: LlmProviderId, fid: AiFeatureId) =>
      getRoutedProviderForFeature(parsed, fid) === providerId,
    [parsed],
  );

  const providerUsedByEnabledFeature = useCallback(
    (providerId: LlmProviderId) =>
      AI_ROUTABLE_FEATURES.some(
        ({ id }) => featureFlags[id] && isAssignedToProvider(providerId, id),
      ),
    [featureFlags, isAssignedToProvider],
  );

  return {
    routableFeatures: AI_ROUTABLE_FEATURES,
    featureFlags,
    isAssignedToProvider,
    providerUsedByEnabledFeature,
  };
}

export type { AiFeatureId };
