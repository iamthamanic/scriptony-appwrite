/**
 * OpenRouter Provider Implementation
 *
 * OpenRouter is an aggregator that provides access to multiple AI providers.
 * Supports:
 * - Text: All major models (GPT-4, Claude, Gemini, Llama, etc.)
 * - Image: DALL·E, Stable Diffusion, Flux, etc.
 * - Video: Runway, Pika, etc.
 * - Embeddings: Multiple embedding models
 *
 * OpenRouter provides a unified API with OpenAI-compatible endpoints.
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
} from "./base";

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";

  readonly capabilities = {
    text: true,
    audio_stt: false, // OpenRouter doesn't provide audio directly
    audio_tts: false,
    image: true,
    video: true,
    embeddings: true,
  };

  private apiKey: string;
  private baseUrl: string;
  private siteUrl?: string;
  private siteName?: string;

  constructor(apiKey: string, siteUrl?: string, siteName?: string) {
    this.apiKey = apiKey;
    this.baseUrl = "https://openrouter.ai/api/v1";
    this.siteUrl = siteUrl;
    this.siteName = siteName;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.siteUrl) {
      headers["HTTP-Referer"] = this.siteUrl;
    }

    if (this.siteName) {
      headers["X-Title"] = this.siteName;
    }

    return headers;
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
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: options.model || "openai/gpt-4o-mini",
        messages: [...systemMessages, ...messages],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        top_p: options.topP,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter chat error: ${response.status} - ${error}`);
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

  async generateImage(
    prompt: string,
    options: ImageOptions,
  ): Promise<ImageResponse> {
    const body: Record<string, unknown> = {
      model: options.model || "openai/dall-e-3",
      messages: [{ role: "user", content: prompt }],
      stream: false,
    };

    // OpenRouter image generation uses modalities + chat/completions for image-capable models
    if (options.modalities?.length) {
      body.modalities = options.modalities;
      body.max_tokens = options.maxTokens ?? 1024;
      if (options.imageConfig) {
        body.image_config = options.imageConfig;
      }
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter image error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // With modalities, image comes back in choices[0].message.images[].image_url.url (data-URL or HTTP URL)
    if (options.modalities?.includes("image")) {
      const imageUrl: string | undefined = data.choices?.[0]?.message?.images
        ?.[0]?.image_url?.url;
      if (imageUrl) {
        // Data-URL → extract base64; HTTP URL → pass through
        const b64Match = /^data:image\/[^;]+;base64,(.+)$/is.exec(
          imageUrl.trim(),
        );
        if (b64Match) {
          return { b64Json: b64Match[1].trim(), revisedPrompt: prompt };
        }
        return { url: imageUrl, revisedPrompt: prompt };
      }
    }

    // Fallback: text content may contain URL
    const imageUrl = data.choices[0]?.message?.content;
    return { url: imageUrl, revisedPrompt: prompt };
  }

  async createEmbedding(
    text: string,
    options: EmbeddingOptions,
  ): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: options.model || "openai/text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `OpenRouter embedding error: ${response.status} - ${error}`,
      );
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
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
