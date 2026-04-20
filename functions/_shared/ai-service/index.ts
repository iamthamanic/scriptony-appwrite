/**
 * AI Service - Central AI Abstraction Layer
 *
 * This module provides a unified interface for multiple AI providers:
 * - OpenAI (GPT-4, DALL·E, Whisper, TTS)
 * - Anthropic (Claude)
 * - Google (Gemini, Imagen, Veo)
 * - OpenRouter (Multi-provider aggregator)
 * - DeepSeek (Coding & Reasoning)
 * - ElevenLabs (TTS)
 * - Ollama (Local models)
 * - HuggingFace (Open-source models)
 *
 * Features:
 * - Text Generation (Chat/Completion)
 * - Speech-to-Text (STT)
 * - Text-to-Speech (TTS)
 * - Image Generation
 * - Video Generation
 * - Embeddings (Vector representations)
 *
 * Usage:
 * ```typescript
 * import { chat, transcribe, generateImage } from "./_shared/ai-service";
 *
 * // Chat
 * const response = await chat(userId, messages, "assistant_chat");
 *
 * // Transcribe audio
 * const transcription = await transcribe(userId, audioUrl);
 *
 * // Generate image
 * const image = await generateImage(userId, prompt);
 * ```
 */

// Providers
export * from "./providers";

// Services
export * from "./services";

// Config
export * from "./config";

// Convenience re-exports
export { chat, streamChat } from "./services/text";
export { transcribe, transcribeWithTimestamps } from "./services/stt";
export { getVoices, synthesize } from "./services/tts";
export {
  generateImage,
  generateImageHD,
  generateImageLandscape,
  generateImagePortrait,
} from "./services/image";
export {
  generateShortVideo,
  generateVideo,
  generateVideoLandscape,
  getVideoStatus,
} from "./services/video";
export {
  cosineSimilarity,
  createEmbedding,
  createEmbeddings,
  findMostSimilar,
} from "./services/embeddings";
export {
  DEFAULT_FEATURE_CONFIG,
  getAISettings,
  hasAPIKey,
  isFeatureConfigured,
  updateAISettings,
  updateAPIKey,
  updateFeatureConfig,
} from "./config/settings";
export {
  getModelInfo,
  getModelsForFeature,
  getModelsForProvider,
  getModelsForProviderFeature,
  MODELS,
  modelSupportsFeature,
} from "./config/models";

export {
  DISCOVERABLE_FEATURE_KEYS,
  discoverModels,
  enrichWithRegistry,
  featureKeyToRegistryFeature,
  isDiscoverableFeatureKey,
} from "./model-discovery";
export type {
  DiscoverableFeatureKey,
  DiscoverModelsOptions,
} from "./model-discovery";
