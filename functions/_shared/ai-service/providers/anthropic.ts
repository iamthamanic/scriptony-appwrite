/**
 * Anthropic Provider Implementation
 *
 * Supports:
 * - Text: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
 *
 * Note: Anthropic does not support audio, image generation, video, or embeddings.
 */

import type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
} from "./base";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";

  readonly capabilities = {
    text: true,
    audio_stt: false,
    audio_tts: false,
    image: false,
    video: false,
    embeddings: false,
  };

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api.anthropic.com/v1";
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions,
  ): Promise<ChatResponse> {
    // Extract system message if present
    const systemMessage = options.systemPrompt ||
      messages.find((m) => m.role === "system")?.content ||
      "";

    // Filter out system messages from messages array
    const filteredMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: options.model || "claude-3-5-sonnet-20241022",
        max_tokens: options.maxTokens ?? 4096,
        system: systemMessage,
        messages: filteredMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        top_p: options.topP,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic chat error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Anthropic returns content as array
    const content = data.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("");

    return {
      content,
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) +
          (data.usage?.output_tokens ?? 0),
      },
      model: data.model,
      finishReason: data.stop_reason,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Anthropic doesn't have a simple health check endpoint
      // We'll try a minimal message request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        }),
      });
      return response.ok || response.status === 400; // 400 = valid key but bad request
    } catch {
      return false;
    }
  }
}
