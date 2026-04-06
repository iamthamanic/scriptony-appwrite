/**
 * Text Service - Chat/Completion
 * 
 * High-level service for text generation (chat, completion).
 * Uses the provider registry to route to the correct provider.
 */

import { resolveFeatureRuntime } from "../config/settings";
import { getProvider, type ChatMessage, type ChatOptions, type ChatResponse } from "../providers";

function toCanonicalTextFeature(feature: string): "assistant_chat" | "creative_gym" {
  if (feature === "creative_gym" || feature === "gym") return "creative_gym";
  return "assistant_chat";
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
  const runtime = await resolveFeatureRuntime(userId, toCanonicalTextFeature(feature));
  const provider = getProvider(runtime.config.provider, {
    apiKey: runtime.apiKey || undefined,
    baseUrl: runtime.baseUrl,
  });
  
  // Check capability
  if (!provider.capabilities.text) {
    throw new Error(`Provider "${runtime.config.provider}" does not support text generation`);
  }

  const { model: _ignoredModel, ...rest } = options || {};
  return provider.chat(messages, {
    ...rest,
    model: runtime.config.model,
    systemPrompt: options?.systemPrompt ?? runtime.userSettings.system_prompt,
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
  const runtime = await resolveFeatureRuntime(userId, toCanonicalTextFeature(feature));
  const provider = getProvider(runtime.config.provider, {
    apiKey: runtime.apiKey || undefined,
    baseUrl: runtime.baseUrl,
  });
  
  // Check capability
  if (!provider.capabilities.text) {
    throw new Error(`Provider "${runtime.config.provider}" does not support text generation`);
  }

  const { model: _ignoredModel, ...rest } = options || {};
  const response = await provider.chat(messages, {
    ...rest,
    stream: true,
    model: runtime.config.model,
    systemPrompt: options?.systemPrompt ?? runtime.userSettings.system_prompt,
  });
  
  // For now, just return the full response
  // TODO: Implement actual streaming with SSE or similar
  onChunk(response.content);
}
