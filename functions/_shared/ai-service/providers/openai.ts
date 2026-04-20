/**
 * OpenAI Provider Implementation
 *
 * Supports:
 * - Text: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo
 * - Audio STT: Whisper
 * - Audio TTS: TTS-1, TTS-1-HD
 * - Image: DALL·E 3, DALL·E 2
 * - Embeddings: text-embedding-3-small, text-embedding-3-large
 */

import type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  ImageOptions,
  ImageResponse,
  STTOptions,
  STTResponse,
  TTSOptions,
  TTSResponse,
} from "./base";
import { Buffer } from "node:buffer";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  readonly capabilities = {
    text: true,
    audio_stt: true,
    audio_tts: true,
    image: true,
    video: false,
    embeddings: true,
  };

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api.openai.com/v1";
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions,
  ): Promise<ChatResponse> {
    const systemMessages = options.systemPrompt
      ? [{ role: "system" as const, content: options.systemPrompt }]
      : [];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: [...systemMessages, ...messages],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        top_p: options.topP,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI chat error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      model: data.model,
      finishReason: data.choices[0].finish_reason,
    };
  }

  async transcribe(
    audioUrl: string,
    options: STTOptions,
  ): Promise<STTResponse> {
    // Download audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }
    const audioBuffer = await audioResponse.arrayBuffer();

    // Create form data
    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer]), "audio.mp3");
    formData.append("model", options.model || "whisper-1");
    if (options.language) {
      formData.append("language", options.language);
    }
    if (options.temperature !== undefined) {
      formData.append("temperature", String(options.temperature));
    }

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI STT error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      text: data.text,
      language: data.language,
      duration: data.duration,
    };
  }

  async synthesize(text: string, options: TTSOptions): Promise<TTSResponse> {
    const response = await fetch(`${this.baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || "tts-1",
        input: text,
        voice: options.voice || "alloy",
        speed: options.speed ?? 1.0,
        response_format: options.responseFormat || "mp3",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI TTS error: ${response.status} - ${error}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return {
      audioBuffer,
      format: options.responseFormat || "mp3",
    };
  }

  async generateImage(
    prompt: string,
    options: ImageOptions,
  ): Promise<ImageResponse> {
    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || "dall-e-3",
        prompt,
        size: options.size || "1024x1024",
        quality: options.quality || "standard",
        style: options.style,
        response_format: options.responseFormat || "url",
        n: 1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI image error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const imageData = data.data[0];

    return {
      url: imageData.url,
      b64Json: imageData.b64_json,
      revisedPrompt: imageData.revised_prompt,
    };
  }

  async createEmbedding(
    text: string,
    options: EmbeddingOptions,
  ): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || "text-embedding-3-small",
        input: text,
        dimensions: options.dimensions,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      embedding: data.data[0].embedding,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
