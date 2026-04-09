/**
 * AI Model Registry
 * 
 * Lists all available models per provider and feature.
 */

import { PROVIDER_CAPABILITIES } from "../providers/base";

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  features: string[];
  contextWindow?: number;
  maxOutputTokens?: number;
  pricing?: {
    input: number; // per 1M tokens
    output: number; // per 1M tokens
  };
}

/**
 * All available models per provider
 */
export const MODELS: Record<string, ModelInfo[]> = {
  openai: [
    // Text models
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "openai",
      features: ["text"],
      contextWindow: 128000,
      maxOutputTokens: 16384,
      pricing: { input: 2.5, output: 10 },
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "openai",
      features: ["text"],
      contextWindow: 128000,
      maxOutputTokens: 16384,
      pricing: { input: 0.15, output: 0.6 },
    },
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      provider: "openai",
      features: ["text"],
      contextWindow: 128000,
      maxOutputTokens: 4096,
      pricing: { input: 10, output: 30 },
    },
    {
      id: "gpt-4",
      name: "GPT-4",
      provider: "openai",
      features: ["text"],
      contextWindow: 8192,
      maxOutputTokens: 8192,
      pricing: { input: 30, output: 60 },
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      provider: "openai",
      features: ["text"],
      contextWindow: 16385,
      maxOutputTokens: 4096,
      pricing: { input: 0.5, output: 1.5 },
    },
    {
      id: "o1",
      name: "o1",
      provider: "openai",
      features: ["text"],
      contextWindow: 200000,
      pricing: { input: 15, output: 60 },
    },
    {
      id: "o1-mini",
      name: "o1 Mini",
      provider: "openai",
      features: ["text"],
      contextWindow: 128000,
      pricing: { input: 3, output: 12 },
    },
    {
      id: "o1-preview",
      name: "o1 Preview",
      provider: "openai",
      features: ["text"],
      contextWindow: 128000,
      pricing: { input: 15, output: 60 },
    },
    {
      id: "o3-mini",
      name: "o3 Mini",
      provider: "openai",
      features: ["text"],
      contextWindow: 200000,
      pricing: { input: 1.1, output: 4.4 },
    },
    {
      id: "o4-mini",
      name: "o4 Mini",
      provider: "openai",
      features: ["text"],
      contextWindow: 200000,
      pricing: { input: 1.1, output: 4.4 },
    },
    {
      id: "gpt-4.1",
      name: "GPT-4.1",
      provider: "openai",
      features: ["text"],
      contextWindow: 1047576,
      maxOutputTokens: 32768,
      pricing: { input: 2, output: 8 },
    },
    {
      id: "gpt-4.1-mini",
      name: "GPT-4.1 Mini",
      provider: "openai",
      features: ["text"],
      contextWindow: 1047576,
      maxOutputTokens: 32768,
      pricing: { input: 0.4, output: 1.6 },
    },
    {
      id: "gpt-4.1-nano",
      name: "GPT-4.1 Nano",
      provider: "openai",
      features: ["text"],
      contextWindow: 1047576,
      maxOutputTokens: 32768,
      pricing: { input: 0.1, output: 0.4 },
    },
    {
      id: "chatgpt-4o-latest",
      name: "ChatGPT-4o Latest",
      provider: "openai",
      features: ["text"],
      contextWindow: 128000,
      maxOutputTokens: 16384,
      pricing: { input: 5, output: 15 },
    },
    // Image models
    {
      id: "dall-e-3",
      name: "DALL·E 3",
      provider: "openai",
      features: ["image"],
      pricing: { input: 0.04, output: 0 }, // per image
    },
    {
      id: "dall-e-2",
      name: "DALL·E 2",
      provider: "openai",
      features: ["image"],
      pricing: { input: 0.02, output: 0 },
    },
    // Audio models
    {
      id: "whisper-1",
      name: "Whisper",
      provider: "openai",
      features: ["audio_stt"],
      pricing: { input: 0.006, output: 0 }, // per minute
    },
    {
      id: "tts-1",
      name: "TTS-1",
      provider: "openai",
      features: ["audio_tts"],
      pricing: { input: 0.015, output: 0 }, // per 1K characters
    },
    {
      id: "tts-1-hd",
      name: "TTS-1 HD",
      provider: "openai",
      features: ["audio_tts"],
      pricing: { input: 0.03, output: 0 },
    },
    // Embedding models
    {
      id: "text-embedding-3-small",
      name: "Embedding Small",
      provider: "openai",
      features: ["embeddings"],
      contextWindow: 8191,
      pricing: { input: 0.02, output: 0 },
    },
    {
      id: "text-embedding-3-large",
      name: "Embedding Large",
      provider: "openai",
      features: ["embeddings"],
      contextWindow: 8191,
      pricing: { input: 0.13, output: 0 },
    },
  ],
  
  anthropic: [
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude Sonnet 4",
      provider: "anthropic",
      features: ["text"],
      contextWindow: 200000,
      maxOutputTokens: 8192,
      pricing: { input: 3, output: 15 },
    },
    {
      id: "claude-3-5-sonnet-20241022",
      name: "Claude 3.5 Sonnet",
      provider: "anthropic",
      features: ["text"],
      contextWindow: 200000,
      maxOutputTokens: 8192,
      pricing: { input: 3, output: 15 },
    },
    {
      id: "claude-3-5-haiku-20241022",
      name: "Claude 3.5 Haiku",
      provider: "anthropic",
      features: ["text"],
      contextWindow: 200000,
      maxOutputTokens: 8192,
      pricing: { input: 0.8, output: 4 },
    },
    {
      id: "claude-3-opus-20240229",
      name: "Claude 3 Opus",
      provider: "anthropic",
      features: ["text"],
      contextWindow: 200000,
      maxOutputTokens: 4096,
      pricing: { input: 15, output: 75 },
    },
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      provider: "anthropic",
      features: ["text"],
      contextWindow: 200000,
      maxOutputTokens: 4096,
      pricing: { input: 0.25, output: 1.25 },
    },
  ],
  
  google: [
    {
      id: "gemini-2.0-flash-exp",
      name: "Gemini 2.0 Flash",
      provider: "google",
      features: ["text"],
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      pricing: { input: 0, output: 0 }, // Free tier available
    },
    {
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
      provider: "google",
      features: ["text"],
      contextWindow: 2097152,
      maxOutputTokens: 8192,
      pricing: { input: 1.25, output: 5 },
    },
    {
      id: "imagen-3.0-generate-002",
      name: "Imagen 3",
      provider: "google",
      features: ["image"],
      pricing: { input: 0.02, output: 0 },
    },
    {
      id: "text-embedding-004",
      name: "Text Embedding",
      provider: "google",
      features: ["embeddings"],
      pricing: { input: 0.0, output: 0 },
    },
  ],
  
  deepseek: [
    {
      id: "deepseek-chat",
      name: "DeepSeek Chat",
      provider: "deepseek",
      features: ["text"],
      contextWindow: 64000,
      maxOutputTokens: 4096,
      pricing: { input: 0.14, output: 0.28 },
    },
    {
      id: "deepseek-coder",
      name: "DeepSeek Coder",
      provider: "deepseek",
      features: ["text"],
      contextWindow: 64000,
      maxOutputTokens: 4096,
      pricing: { input: 0.14, output: 0.28 },
    },
  ],
  
  openrouter: [
    // OpenRouter aggregates models from multiple providers
    {
      id: "openai/gpt-4o-mini",
      name: "GPT-4o Mini (via OpenRouter)",
      provider: "openrouter",
      features: ["text"],
      contextWindow: 128000,
      pricing: { input: 0.15, output: 0.6 },
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet (via OpenRouter)",
      provider: "openrouter",
      features: ["text"],
      contextWindow: 200000,
      pricing: { input: 3, output: 15 },
    },
    {
      id: "google/gemini-2.0-flash-exp",
      name: "Gemini 2.0 Flash (via OpenRouter)",
      provider: "openrouter",
      features: ["text"],
      contextWindow: 1048576,
      pricing: { input: 0, output: 0 },
    },
    {
      id: "deepseek/deepseek-chat",
      name: "DeepSeek Chat (via OpenRouter)",
      provider: "openrouter",
      features: ["text"],
      contextWindow: 64000,
      pricing: { input: 0.14, output: 0.28 },
    },
  ],
  
  elevenlabs: [
    {
      id: "eleven_multilingual_v2",
      name: "Multilingual v2",
      provider: "elevenlabs",
      features: ["audio_tts"],
      pricing: { input: 0.03, output: 0 }, // per 1K characters
    },
    {
      id: "eleven_turbo_v2_5",
      name: "Turbo v2.5",
      provider: "elevenlabs",
      features: ["audio_tts"],
      pricing: { input: 0.015, output: 0 },
    },
  ],
  
  ollama: [
    {
      id: "llama3.1",
      name: "Llama 3.1",
      provider: "ollama",
      features: ["text"],
      contextWindow: 128000,
      pricing: { input: 0, output: 0 },
    },
    {
      id: "mistral",
      name: "Mistral",
      provider: "ollama",
      features: ["text"],
      contextWindow: 32768,
      pricing: { input: 0, output: 0 },
    },
    {
      id: "nomic-embed-text",
      name: "Nomic Embed Text",
      provider: "ollama",
      features: ["embeddings"],
      pricing: { input: 0, output: 0 },
    },
  ],
  
  huggingface: [
    {
      id: "meta-llama/Llama-3.2-3B-Instruct",
      name: "Llama 3.2 3B",
      provider: "huggingface",
      features: ["text"],
      pricing: { input: 0, output: 0 },
    },
    {
      id: "sentence-transformers/all-MiniLM-L6-v2",
      name: "MiniLM Embeddings",
      provider: "huggingface",
      features: ["embeddings"],
      pricing: { input: 0, output: 0 },
    },
  ],
};

/**
 * Get all models for a provider
 */
export function getModelsForProvider(provider: string): ModelInfo[] {
  const key =
    provider === "ollama_local" || provider === "ollama_cloud" || provider === "ollama"
      ? "ollama"
      : provider;
  const rows = MODELS[key] || [];
  if (provider === "ollama_local" || provider === "ollama_cloud") {
    return rows.map((m) => ({ ...m, provider }));
  }
  return rows;
}

/**
 * Get all models for a feature
 */
export function getModelsForFeature(feature: string): ModelInfo[] {
  return Object.values(MODELS)
    .flat()
    .filter(model => model.features.includes(feature));
}

/**
 * Get all models for a provider and feature
 */
export function getModelsForProviderFeature(provider: string, feature: string): ModelInfo[] {
  return getModelsForProvider(provider).filter(model => model.features.includes(feature));
}

/**
 * Check if a model supports a feature
 */
export function modelSupportsFeature(modelId: string, feature: string): boolean {
  const model = Object.values(MODELS)
    .flat()
    .find(m => m.id === modelId);
  
  return model?.features.includes(feature) ?? false;
}

/**
 * Get model info
 */
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return Object.values(MODELS)
    .flat()
    .find(m => m.id === modelId);
}