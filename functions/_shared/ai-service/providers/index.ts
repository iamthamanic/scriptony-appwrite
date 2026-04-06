/**
 * AI Provider Registry
 * 
 * Exports all provider implementations and provides factory function.
 */

import type { AIProvider } from "./base";
import { PROVIDER_CAPABILITIES } from "./base";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GoogleProvider } from "./google";
import { OpenRouterProvider } from "./openrouter";
import { DeepSeekProvider } from "./deepseek";
import { ElevenLabsProvider } from "./elevenlabs";
import { OllamaProvider } from "./ollama";
import { HuggingFaceProvider } from "./huggingface";

// Re-export types
export * from "./base";

// Re-export providers
export { OpenAIProvider } from "./openai";
export { AnthropicProvider } from "./anthropic";
export { GoogleProvider } from "./google";
export { OpenRouterProvider } from "./openrouter";
export { DeepSeekProvider } from "./deepseek";
export { ElevenLabsProvider } from "./elevenlabs";
export { OllamaProvider } from "./ollama";
export { HuggingFaceProvider } from "./huggingface";

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  projectId?: string;
  siteUrl?: string;
  siteName?: string;
}

/**
 * Create an AI provider instance
 * 
 * @param name - Provider name (openai, anthropic, etc.)
 * @param config - Provider configuration (apiKey, baseUrl, etc.)
 * @returns AIProvider instance
 */
export function getProvider(name: string, config: ProviderConfig = {}): AIProvider {
  switch (name) {
    case "openai":
      if (!config.apiKey) throw new Error("OpenAI API key required");
      return new OpenAIProvider(config.apiKey, config.baseUrl);
    
    case "anthropic":
      if (!config.apiKey) throw new Error("Anthropic API key required");
      return new AnthropicProvider(config.apiKey, config.baseUrl);
    
    case "google":
      if (!config.apiKey) throw new Error("Google API key required");
      return new GoogleProvider(config.apiKey, config.projectId);
    
    case "openrouter":
      if (!config.apiKey) throw new Error("OpenRouter API key required");
      return new OpenRouterProvider(config.apiKey, config.siteUrl, config.siteName);
    
    case "deepseek":
      if (!config.apiKey) throw new Error("DeepSeek API key required");
      return new DeepSeekProvider(config.apiKey, config.baseUrl);
    
    case "elevenlabs":
      if (!config.apiKey) throw new Error("ElevenLabs API key required");
      return new ElevenLabsProvider(config.apiKey, config.baseUrl);
    
    case "ollama":
      return new OllamaProvider(config.baseUrl, config.apiKey);
    
    case "huggingface":
      if (!config.apiKey) throw new Error("HuggingFace API key required");
      return new HuggingFaceProvider(config.apiKey, config.baseUrl);
    
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

/**
 * Check if a provider supports a feature
 */
export function hasCapability(provider: string, feature: keyof AIProvider["capabilities"]): boolean {
  return PROVIDER_CAPABILITIES[provider]?.[feature] ?? false;
}

/**
 * Get all providers that support a feature
 */
export function getProvidersWithFeature(feature: keyof AIProvider["capabilities"]): string[] {
  return Object.entries(PROVIDER_CAPABILITIES)
    .filter(([_, caps]) => caps[feature])
    .map(([name]) => name);
}

/**
 * Get provider display name
 */
export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
  elevenlabs: "ElevenLabs",
  ollama: "Ollama (Lokal)",
  huggingface: "HuggingFace",
};
