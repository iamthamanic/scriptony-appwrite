/**
 * DeepSeek Provider Implementation
 *
 * Supports:
 * - Text: DeepSeek Chat, DeepSeek Coder
 * - Embeddings: DeepSeek Embedding
 *
 * Note: DeepSeek specializes in coding and reasoning models.
 */

import type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  EmbeddingOptions,
  EmbeddingResponse,
} from "./base";

export class DeepSeekProvider implements AIProvider {
  readonly name = "deepseek";

  readonly capabilities = {
    text: true,
    audio_stt: false,
    audio_tts: false,
    image: false,
    video: false,
    embeddings: true,
  };

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api.deepseek.com/v1";
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
        model: options.model || "deepseek-chat",
        messages: [...systemMessages, ...messages],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        top_p: options.topP,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek chat error: ${response.status} - ${error}`);
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
        model: options.model || "deepseek-embed",
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `DeepSeek embedding error: ${response.status} - ${error}`,
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
