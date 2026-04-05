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
export { synthesize, getVoices } from "./services/tts";
export { generateImage, generateImageHD, generateImageLandscape, generateImagePortrait } from "./services/image";
export { generateVideo, getVideoStatus, generateShortVideo, generateVideoLandscape } from "./services/video";
export { createEmbedding, createEmbeddings, cosineSimilarity, findMostSimilar } from "./services/embeddings";
export { 
  getAISettings, 
  updateAISettings, 
  updateAPIKey, 
  updateFeatureConfig,
  hasAPIKey,
  isFeatureConfigured,
  DEFAULT_FEATURE_CONFIG 
} from "./config/settings";
export { 
  getModelsForProvider, 
  getModelsForFeature, 
  getModelsForProviderFeature,
  modelSupportsFeature,
  getModelInfo,
  MODELS 
} from "./config/models";