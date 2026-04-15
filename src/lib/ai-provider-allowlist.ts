/**
 * Per-feature allowlist of scriptony-ai provider IDs (matches PROVIDER_CAPABILITIES / backend).
 * Used by AIIntegrationsSection to show only relevant providers per area.
 * Location: src/lib/ai-provider-allowlist.ts
 */

export type AiFeatureKey =
  | "assistant_chat"
  | "assistant_embeddings"
  | "creative_gym"
  | "image_generation"
  | "audio_stt"
  | "audio_tts"
  | "video_generation";

export type OllamaUiMode = "local" | "cloud";

export const CANONICAL_OLLAMA_PROVIDER_ID = "ollama" as const;

/** Ollama API variants (legacy runtime/provider ids). */
export const OLLAMA_FAMILY_PROVIDER_IDS = ["ollama", "ollama_local", "ollama_cloud"] as const;

export function isOllamaFamilyProviderId(id: string): boolean {
  return (OLLAMA_FAMILY_PROVIDER_IDS as readonly string[]).includes(id);
}

export function normalizeProviderIdForUi(id: string): string {
  return isOllamaFamilyProviderId(id) ? CANONICAL_OLLAMA_PROVIDER_ID : id;
}

export function inferOllamaModeFromProviderId(id: string): OllamaUiMode {
  return id === "ollama_cloud" ? "cloud" : "local";
}

/**
 * Infer Ollama mode for a feature, considering stored cloud keys.
 * For explicit provider IDs (ollama_cloud/ollama_local), returns the corresponding mode.
 * For plain "ollama", checks whether a cloud key exists for this feature — if so, defaults to "cloud".
 * This prevents users with stored cloud keys from seeing "local" mode by default.
 */
export function inferOllamaModeForFeature(
  providerId: string,
  featureKey: string,
  featureProviderKeyIndex: Record<string, boolean>
): OllamaUiMode {
  if (providerId === "ollama_cloud") return "cloud";
  if (providerId === "ollama_local") return "local";
  // For plain "ollama", check if a cloud key exists
  const cloudKeySlot = `${featureKey}:ollama_cloud`;
  const canonicalKeySlot = `${featureKey}:ollama`;
  if (featureProviderKeyIndex[cloudKeySlot] || featureProviderKeyIndex[canonicalKeySlot]) {
    return "cloud";
  }
  return "local";
}

export function providerIdForOllamaMode(mode: OllamaUiMode): "ollama_local" | "ollama_cloud" {
  return mode === "cloud" ? "ollama_cloud" : "ollama_local";
}

export function collapseProvidersForFeature<T extends { id: string; name?: string }>(
  providerIdsWithCapability: T[]
): T[] {
  const collapsed: T[] = [];
  let ollamaSeen = false;

  for (const provider of providerIdsWithCapability) {
    if (!isOllamaFamilyProviderId(provider.id)) {
      collapsed.push(provider);
      continue;
    }

    if (ollamaSeen) continue;
    ollamaSeen = true;
    collapsed.push({
      ...provider,
      id: CANONICAL_OLLAMA_PROVIDER_ID,
      name: "Ollama",
    });
  }

  return collapsed;
}

/**
 * Which providers appear in the dropdown per feature.
 * The UI collapses all Ollama runtime variants into a single canonical `ollama` choice.
 *
 * NOTE: "ollama_local" and "ollama_cloud" are legacy runtime IDs kept here for backward
 * compatibility with existing feature_config rows. Once the migration in
 * functions/scriptony-ai/migrate-ollama-provider-ids.mjs has been run, these can be removed.
 */
export const AI_FEATURE_PROVIDER_ALLOWLIST: Record<AiFeatureKey, readonly string[]> = {
  assistant_chat: [
    "openai",
    "anthropic",
    "google",
    "deepseek",
    "openrouter",
    "huggingface",
    "ollama",
    "ollama_local",
    "ollama_cloud",
  ],
  assistant_embeddings: [
    "openai",
    "google",
    "deepseek",
    "openrouter",
    "huggingface",
    "ollama",
    "ollama_local",
    "ollama_cloud",
  ],
  creative_gym: [
    "openai",
    "anthropic",
    "google",
    "deepseek",
    "openrouter",
    "huggingface",
    "ollama",
    "ollama_local",
    "ollama_cloud",
  ],
  image_generation: [
    "openai",
    "google",
    "openrouter",
    "ollama",
    "ollama_local",
    "ollama_cloud",
  ],
  video_generation: ["openrouter", "huggingface", "ollama", "ollama_local", "ollama_cloud"],
  audio_stt: ["openai", "openrouter", "huggingface", "ollama", "ollama_local", "ollama_cloud"],
  audio_tts: ["elevenlabs", "openrouter", "huggingface", "ollama", "ollama_local", "ollama_cloud"],
};

export function filterProvidersForFeature<T extends { id: string }>(
  featureKey: string,
  providerIdsWithCapability: T[]
): T[] {
  const list = AI_FEATURE_PROVIDER_ALLOWLIST[featureKey as AiFeatureKey];
  if (!list) return providerIdsWithCapability;
  const allow = new Set(list);
  return collapseProvidersForFeature(providerIdsWithCapability.filter((p) => allow.has(p.id)));
}
