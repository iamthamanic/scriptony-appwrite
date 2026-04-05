/**
 * Text Service - Chat/Completion
 * 
 * High-level service for text generation (chat, completion).
 * Uses the provider registry to route to the correct provider.
 */

import { getProvider, type ChatMessage, type ChatOptions, type ChatResponse } from "../providers";

/**
 * User AI settings (loaded from database)
 */
interface UserAISettings {
  api_keys: Record<string, string>;
  features: {
    [feature: string]: {
      provider: string;
      model: string;
    };
  };
}

/**
 * Get AI settings for a user
 * 
 * TODO: Replace with actual database lookup
 */
async function getUserSettings(userId: string): Promise<UserAISettings> {
  // Placeholder - implement actual DB lookup
  return {
    api_keys: {},
    features: {
      assistant_chat: { provider: "openai", model: "gpt-4o-mini" },
      assistant_embeddings: { provider: "openai", model: "text-embedding-3-small" },
      creative_gym: { provider: "openai", model: "gpt-4o" },
      image_generation: { provider: "openai", model: "dall-e-3" },
      audio_stt: { provider: "openai", model: "whisper-1" },
      audio_tts: { provider: "elevenlabs", model: "eleven_multilingual_v2" },
      video_generation: { provider: "openrouter", model: "runway-gen3" },
    },
  };
}

/**
 * Chat with AI using feature-specific configuration
 * 
 * @param userId - User ID
 * @param messages - Chat messages
 * @param feature - Feature name (assistant_chat, creative_gym, etc.)
 * @param options - Additional chat options
 * @returns Chat response
 */
export async function chat(
  userId: string,
  messages: ChatMessage[],
  feature: string,
  options?: Partial<ChatOptions>
): Promise<ChatResponse> {
  // Load user settings
  const settings = await getUserSettings(userId);
  
  // Get feature configuration
  const featureConfig = settings.features[feature];
  if (!featureConfig) {
    throw new Error(`Feature "${feature}" not configured`);
  }
  
  // Get provider
  const provider = getProvider(featureConfig.provider, {
    apiKey: settings.api_keys[featureConfig.provider],
  });
  
  // Check capability
  if (!provider.capabilities.text) {
    throw new Error(`Provider "${featureConfig.provider}" does not support text generation`);
  }
  
  // Chat
  return provider.chat(messages, {
    model: featureConfig.model,
    ...options,
  });
}

/**
 * Stream chat with AI (for real-time responses)
 * 
 * @param userId - User ID
 * @param messages - Chat messages
 * @param feature - Feature name
 * @param onChunk - Callback for each chunk
 * @param options - Additional chat options
 */
export async function streamChat(
  userId: string,
  messages: ChatMessage[],
  feature: string,
  onChunk: (chunk: string) => void,
  options?: Partial<ChatOptions>
): Promise<void> {
  // Load user settings
  const settings = await getUserSettings(userId);
  
  // Get feature configuration
  const featureConfig = settings.features[feature];
  if (!featureConfig) {
    throw new Error(`Feature "${feature}" not configured`);
  }
  
  // Get provider
  const provider = getProvider(featureConfig.provider, {
    apiKey: settings.api_keys[featureConfig.provider],
  });
  
  // Check capability
  if (!provider.capabilities.text) {
    throw new Error(`Provider "${featureConfig.provider}" does not support text generation`);
  }
  
  // Stream chat
  // Note: Streaming implementation depends on provider
  const response = await provider.chat(messages, {
    model: featureConfig.model,
    stream: true,
    ...options,
  });
  
  // For now, just return the full response
  // TODO: Implement actual streaming with SSE or similar
  onChunk(response.content);
}