/**
 * Google Provider Implementation
 *
 * Supports:
 * - Text: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
 * - Image: Imagen 3
 * - Video: Veo
 * - Embeddings: text-embedding-004
 *
 * Note: Google uses Vertex AI for video/image, Gemini API for text.
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
  VideoOptions,
  VideoResponse,
} from "./base";

export class GoogleProvider implements AIProvider {
  readonly name = "google";

  readonly capabilities = {
    text: true,
    audio_stt: false,
    audio_tts: false,
    image: true,
    video: true,
    embeddings: true,
  };

  private apiKey: string;
  private projectId?: string;

  constructor(apiKey: string, projectId?: string) {
    this.apiKey = apiKey;
    this.projectId = projectId;
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions,
  ): Promise<ChatResponse> {
    const systemInstruction = options.systemPrompt
      ? { parts: [{ text: options.systemPrompt }] }
      : undefined;

    // Convert messages to Google format
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : m.role,
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${
        options.model || "gemini-2.0-flash-exp"
      }:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 2000,
            topP: options.topP,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google chat error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      content: text,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      },
      model: options.model || "gemini-2.0-flash-exp",
      finishReason: data.candidates?.[0]?.finishReason || "stop",
    };
  }

  async generateImage(
    prompt: string,
    options: ImageOptions,
  ): Promise<ImageResponse> {
    // Google Imagen 3 via Vertex AI
    // Note: This requires OAuth2 or API key with Vertex AI access

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: options.size?.includes("1792")
              ? "16:9"
              : options.size?.includes("1024x1792")
              ? "9:16"
              : "1:1",
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google image error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Imagen returns base64-encoded images
    const imageData = data.predictions?.[0]?.bytesBase64Encoded;

    return {
      b64Json: imageData,
      revisedPrompt: prompt,
    };
  }

  async generateVideo(
    _prompt: string,
    _options: VideoOptions,
  ): Promise<VideoResponse> {
    // Google Veo via Vertex AI
    // Note: This requires Vertex AI access and proper authentication

    // For now, return a placeholder as Veo requires special setup
    throw new Error(
      "Video generation with Google Veo requires Vertex AI setup. Use OpenRouter instead.",
    );
  }

  async getVideoStatus(_videoId: string): Promise<VideoResponse> {
    throw new Error(
      "Video generation with Google Veo requires Vertex AI setup. Use OpenRouter instead.",
    );
  }

  async createEmbedding(
    text: string,
    options: EmbeddingOptions,
  ): Promise<EmbeddingResponse> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${
        options.model || "text-embedding-004"
      }:embedContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: `models/${options.model || "text-embedding-004"}`,
          content: {
            parts: [{ text }],
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google embedding error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      embedding: data.embedding?.values || [],
      usage: {
        promptTokens: 0, // Google doesn't provide token counts for embeddings
        totalTokens: 0,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`,
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
