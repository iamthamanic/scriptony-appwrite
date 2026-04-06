/**
 * Base AI Provider Interface
 * 
 * All AI providers must implement this interface.
 * Provides abstraction for different AI modalities:
 * - Text (Chat/Completion)
 * - Audio (STT/TTS)
 * - Image (Generation)
 * - Video (Generation)
 * - Embeddings (Vector representations)
 */

export type MessageRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  systemPrompt?: string;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: "stop" | "length" | "content_filter" | string;
}

export interface STTOptions {
  provider?: string;
  model?: string;
  language?: string;
  temperature?: number;
  timestamps?: boolean;
  timestampGranularities?: ("word" | "segment")[];
}

export interface STTResponse {
  text: string;
  duration?: number;
  language?: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface TTSOptions {
  provider?: string;
  model?: string;
  voice?: string;
  speed?: number;
  language?: string;
  format?: "mp3" | "wav" | "pcm";
  responseFormat?: "mp3" | "wav" | "pcm";
}

export interface TTSResponse {
  audioBuffer: Buffer;
  duration?: number;
  format: string;
}

export interface ImageOptions {
  provider?: string;
  model?: string;
  size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
  negative_prompt?: string;
  style_preset?: string;
  responseFormat?: "url" | "b64_json";
}

export interface ImageResponse {
  url?: string;
  b64Json?: string;
  revisedPrompt?: string;
}

export interface VideoOptions {
  provider?: string;
  model?: string;
  duration?: number; // seconds
  aspectRatio?: "16:9" | "9:16" | "1:1";
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  resolution?: "720p" | "1080p" | "4k";
  fps?: number;
  style_preset?: string;
  negative_prompt?: string;
}

export interface VideoResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  url?: string;
  duration?: number;
  thumbnail?: string;
  estimated_time?: number;
}

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * AI Provider Interface
 * 
 * All providers must implement at least the text() method.
 * Other methods are optional based on provider capabilities.
 */
export interface AIProvider {
  readonly name: string;
  readonly capabilities: {
    text: boolean;
    audio_stt: boolean;
    audio_tts: boolean;
    image: boolean;
    video: boolean;
    embeddings: boolean;
  };
  
  // Text/Chat
  chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse>;
  
  // Audio - Speech-to-Text
  transcribe?(audioUrl: string, options: STTOptions): Promise<STTResponse>;
  
  // Audio - Text-to-Speech
  synthesize?(text: string, options: TTSOptions): Promise<TTSResponse>;
  
  // Image Generation
  generateImage?(prompt: string, options: ImageOptions): Promise<ImageResponse>;
  
  // Video Generation
  generateVideo?(prompt: string, options: VideoOptions): Promise<VideoResponse>;
  
  // Video Status Check
  getVideoStatus?(videoId: string): Promise<VideoResponse>;
  
  // Embeddings
  createEmbedding?(text: string, options: EmbeddingOptions): Promise<EmbeddingResponse>;
  
  // Health Check
  healthCheck?(): Promise<boolean>;
}

/**
 * Provider capabilities registry
 */
export const PROVIDER_CAPABILITIES: Record<string, AIProvider['capabilities']> = {
  openai: {
    text: true,
    audio_stt: true,
    audio_tts: true,
    image: true,
    video: false,
    embeddings: true,
  },
  anthropic: {
    text: true,
    audio_stt: false,
    audio_tts: false,
    image: false,
    video: false,
    embeddings: false,
  },
  google: {
    text: true,
    audio_stt: false,
    audio_tts: false,
    image: true,
    video: true,
    embeddings: true,
  },
  deepseek: {
    text: true,
    audio_stt: false,
    audio_tts: false,
    image: false,
    video: false,
    embeddings: true,
  },
  openrouter: {
    text: true,
    audio_stt: false,
    audio_tts: false,
    image: true,
    video: true,
    embeddings: true,
  },
  elevenlabs: {
    text: false,
    audio_stt: false,
    audio_tts: true,
    image: false,
    video: false,
    embeddings: false,
  },
  ollama: {
    text: true,
    audio_stt: true,
    audio_tts: true,
    image: true,
    video: false,
    embeddings: true,
  },
  huggingface: {
    text: true,
    audio_stt: true,
    audio_tts: true,
    image: true,
    video: true,
    embeddings: true,
  },
};
