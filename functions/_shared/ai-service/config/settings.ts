/**
 * AI Settings Management
 * 
 * Central configuration for AI providers and feature assignments.
 */

/**
 * User AI Settings
 */
export interface AISettings {
  // API Keys (one per provider)
  api_keys: {
    openai?: string;
    anthropic?: string;
    google?: string;
    openrouter?: string;
    deepseek?: string;
    elevenlabs?: string;
    huggingface?: string;
    ollama_base_url?: string;
  };
  
  // Feature Assignments
  features: {
    assistant_chat: FeatureConfig;
    assistant_embeddings: FeatureConfig;
    creative_gym: FeatureConfig;
    image_generation: FeatureConfig;
    audio_stt: FeatureConfig;
    audio_tts: FeatureConfig & { voice?: string };
    video_generation: FeatureConfig;
  };
}

/**
 * Feature Configuration
 */
export interface FeatureConfig {
  provider: string;
  model: string;
}

/**
 * Default feature configuration
 */
export const DEFAULT_FEATURE_CONFIG: AISettings["features"] = {
  assistant_chat: {
    provider: "openai",
    model: "gpt-4o-mini",
  },
  assistant_embeddings: {
    provider: "openai",
    model: "text-embedding-3-small",
  },
  creative_gym: {
    provider: "openai",
    model: "gpt-4o",
  },
  image_generation: {
    provider: "openai",
    model: "dall-e-3",
  },
  audio_stt: {
    provider: "openai",
    model: "whisper-1",
  },
  audio_tts: {
    provider: "elevenlabs",
    model: "eleven_multilingual_v2",
    voice: "21m00Tcm4TlvDq8ikWAM", // Rachel
  },
  video_generation: {
    provider: "openrouter",
    model: "runway-gen3",
  },
};

/**
 * Get AI settings for a user
 * 
 * @param userId - User ID
 * @returns User AI settings
 */
export async function getAISettings(userId: string): Promise<AISettings> {
  // TODO: Implement actual database lookup
  // For now, return default settings with empty API keys
  
  return {
    api_keys: {},
    features: DEFAULT_FEATURE_CONFIG,
  };
}

/**
 * Update AI settings for a user
 * 
 * @param userId - User ID
 * @param settings - Partial settings to update
 */
export async function updateAISettings(
  userId: string,
  settings: Partial<AISettings>
): Promise<void> {
  // TODO: Implement actual database save
  console.log(`Updating AI settings for user ${userId}:`, settings);
}

/**
 * Update API key for a provider
 * 
 * @param userId - User ID
 * @param provider - Provider name
 * @param apiKey - API key
 */
export async function updateAPIKey(
  userId: string,
  provider: string,
  apiKey: string
): Promise<void> {
  // TODO: Implement actual database save
  console.log(`Updating API key for ${provider} for user ${userId}`);
}

/**
 * Update feature configuration
 * 
 * @param userId - User ID
 * @param feature - Feature name
 * @param config - Feature configuration
 */
export async function updateFeatureConfig(
  userId: string,
  feature: keyof AISettings["features"],
  config: FeatureConfig
): Promise<void> {
  // TODO: Implement actual database save
  console.log(`Updating feature ${feature} for user ${userId}:`, config);
}

/**
 * Check if user has API key for a provider
 */
export function hasAPIKey(settings: AISettings, provider: string): boolean {
  if (provider === "ollama") {
    return true; // Ollama doesn't need an API key
  }
  
  return !!settings.api_keys[provider as keyof typeof settings.api_keys];
}

/**
 * Check if a feature is configured
 */
export function isFeatureConfigured(
  settings: AISettings,
  feature: keyof AISettings["features"]
): boolean {
  const config = settings.features[feature];
  return hasAPIKey(settings, config.provider);
}