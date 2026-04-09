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

/** Ollama API variants (no API key; base URL in UI). */
export const OLLAMA_FAMILY_PROVIDER_IDS = ["ollama", "ollama_local", "ollama_cloud"] as const;

export function isOllamaFamilyProviderId(id: string): boolean {
  return (OLLAMA_FAMILY_PROVIDER_IDS as readonly string[]).includes(id);
}

/**
 * Which providers appear in the dropdown per feature.
 * Includes legacy `ollama` for existing saved configs; prefer ollama_local / ollama_cloud for new setups.
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
  return providerIdsWithCapability.filter((p) => allow.has(p.id));
}
