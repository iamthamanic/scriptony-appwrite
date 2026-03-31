/**
 * Routable AI surface areas (Assistant, Gym, Stage) — single list for provider cards + toggles.
 * Add a row in AI_ROUTABLE_FEATURES when a new routeable feature exists; provider UIs pick it up automatically.
 * Location: src/lib/ai-feature-routing.ts
 */

import type { LlmProviderId } from "./llm-provider-registry";

export type AiFeatureId = "assistant" | "gym" | "stage";

export const AI_ROUTABLE_FEATURES: ReadonlyArray<{ id: AiFeatureId; label: string }> = [
  { id: "assistant", label: "Assistant" },
  { id: "gym", label: "Gym" },
  { id: "stage", label: "Stage" },
] as const;

/** Subset of parsed settings_json used for feature routing UI. */
export interface AiFeatureRoutingParsed {
  enabled_features?: AiFeatureId[];
  feature_profiles?: Partial<
    Record<AiFeatureId, { provider?: LlmProviderId; model?: string; temperature?: number; max_tokens?: number }>
  >;
}

export function getAiFeatureFlags(parsed: AiFeatureRoutingParsed | undefined): Record<AiFeatureId, boolean> {
  const ef = parsed?.enabled_features;
  if (ef === undefined) {
    return { assistant: true, gym: true, stage: true };
  }
  return {
    assistant: ef.includes("assistant"),
    gym: ef.includes("gym"),
    stage: ef.includes("stage"),
  };
}

export function getRoutedProviderForFeature(
  parsed: AiFeatureRoutingParsed | undefined,
  fid: AiFeatureId
): LlmProviderId | undefined {
  return parsed?.feature_profiles?.[fid]?.provider;
}

/**
 * Same fallback as backend `resolveAiFeatureProfile` / ScriptonyAssistant: wenn kein
 * `feature_profiles[fid].provider` gesetzt ist, gilt `active_provider` für dieses Feature.
 */
export function getEffectiveProviderForFeature(
  parsed: AiFeatureRoutingParsed | undefined,
  fid: AiFeatureId,
  activeProvider: string | undefined
): LlmProviderId | undefined {
  const explicit = parsed?.feature_profiles?.[fid]?.provider;
  if (explicit) return explicit;
  if (activeProvider && activeProvider.length > 0) return activeProvider as LlmProviderId;
  return undefined;
}
