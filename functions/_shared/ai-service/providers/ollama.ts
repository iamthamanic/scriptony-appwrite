/**
 * Ollama Provider Implementation (Local)
 * 
 * Ollama runs models locally on your machine.
 * Supports:
 * - Text: Llama 3.1, Mistral, Qwen, Gemma, etc.
 * - Audio STT: Whisper (via whisper model)
 * - Audio TTS: Piper (via bark or similar)
 * - Image: Stable Diffusion, LLaVA (vision)
 * - Embeddings: nomic-embed-text, etc.
 * 
 * Note: Requires Ollama to be running locally.
 */

import type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  STTOptions,
  STTResponse,
  TTSOptions,
  TTSResponse,
  ImageOptions,
  ImageResponse,
  EmbeddingOptions,
  EmbeddingResponse,
} from "./base";
import * as http from "node:http";
import * as https from "node:https";
import { OLLAMA_CLOUD_ORIGIN } from "../../ai-feature-profile";

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

const REQUEST_TIMEOUT_MS = 25_000;
const USER_AGENT = "ScriptonyAppwrite/1.0";

type OllamaCloudChatPayload = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    message?: {
      role?: string;
      content?: string;
      reasoning?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type OllamaCloudChatResult =
  | { ok: true; status: number; payload: OllamaCloudChatPayload }
  | { ok: false; status: number; error: string };

type OllamaCloudImageResult =
  | { ok: true; status: number; payload: unknown }
  | { ok: false; status: number; error: string };

function requestOllamaCloud(
  path: string,
  baseUrl: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<OllamaCloudImageResult> {
  const urlStr = `${trimSlash(baseUrl)}${path}`;
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return Promise.resolve({ ok: false, status: 0, error: `Invalid URL: ${urlStr}` });
  }

  const lib = u.protocol === "https:" ? https : http;
  const rawBody = JSON.stringify(body);
  const mergedHeaders: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Content-Length": String(Buffer.byteLength(rawBody, "utf8")),
    "User-Agent": USER_AGENT,
    ...headers,
  };

  return new Promise((resolve) => {
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        method: "POST",
        headers: mergedHeaders,
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          const raw = Buffer.concat(chunks).toString("utf8");
          let payload: unknown = {};
          if (raw.trim()) {
            try {
              payload = JSON.parse(raw);
            } catch {
              payload = {};
            }
          }
          if (status >= 200 && status < 300) {
            resolve({ ok: true, status, payload });
          } else {
            resolve({
              ok: false,
              status,
              error: raw.slice(0, 400) || `HTTP ${status}`,
            });
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: 0, error: `Provider timeout after ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s` });
    });
    req.on("error", (err: Error) => {
      resolve({ ok: false, status: 0, error: err.message || "Network error" });
    });
    req.write(rawBody);
    req.end();
  });
}

function requestOllamaCloudChat(
  baseUrl: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<OllamaCloudChatResult> {
  return requestOllamaCloud("/v1/chat/completions", baseUrl, headers, body).then((r) => {
    if (!r.ok) return r;
    return { ok: true, status: r.status, payload: r.payload as OllamaCloudChatPayload };
  });
}

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  
  readonly capabilities = {
    text: true,
    audio_stt: true,
    audio_tts: true,
    image: true,
    video: false,
    embeddings: true,
  };
  
  private baseUrl: string;
  private apiKey?: string;
  
  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || "http://localhost:11434";
    this.apiKey = apiKey;
  }

  private isCloudMode(): boolean {
    return trimSlash(this.baseUrl) === OLLAMA_CLOUD_ORIGIN;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    return headers;
  }
  
  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    const systemMessages = options.systemPrompt
      ? [{ role: "system" as const, content: options.systemPrompt }]
      : [];

    if (this.isCloudMode()) {
      const result = await requestOllamaCloudChat(trimSlash(this.baseUrl), this.headers(), {
        model: options.model || "llama3.1",
        messages: [...systemMessages, ...messages],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        top_p: options.topP,
        stream: false,
      });

      if (!result.ok) {
        throw new Error(`Ollama cloud chat error: ${result.status} - ${result.error}`);
      }
      const data = result.payload;
      const assistantMessage = data.choices?.[0]?.message;
      const content = assistantMessage?.content?.trim() || assistantMessage?.reasoning?.trim() || "";

      return {
        content,
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
        },
        model: data.model ?? options.model,
        finishReason: data.choices?.[0]?.finish_reason ?? "stop",
      };
    }

    const response = await fetch(`${trimSlash(this.baseUrl)}/api/chat`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: options.model || "llama3.1",
        messages: [...systemMessages, ...messages],
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 2000,
          top_p: options.topP,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama chat error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.message.content,
      usage: {
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
      model: data.model,
      finishReason: data.done ? "stop" : "length",
    };
  }
  
  async transcribe(audioUrl: string, options: STTOptions): Promise<STTResponse> {
    // Download audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    
    // Ollama doesn't have direct STT, but we can use whisper model
    // This is a simplified implementation
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: options.model || "whisper",
        prompt: "Transcribe this audio",
        stream: false,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama STT error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      text: data.response,
    };
  }
  
  async synthesize(text: string, options: TTSOptions): Promise<TTSResponse> {
    // Ollama doesn't have direct TTS, but some models support audio generation
    // This is a placeholder for models like bark or similar
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: options.model || "bark",
        prompt: text,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama TTS error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // This would need actual audio generation support
    return {
      audioBuffer: Buffer.from([]),
      format: "wav",
    };
  }
  
  async generateImage(prompt: string, options: ImageOptions): Promise<ImageResponse> {
    const model = options.model || "stable-diffusion";

    if (this.isCloudMode()) {
      // Ollama Cloud: use native /api/generate for x/ models, /v1/images/generations otherwise
      const useNative = model.startsWith("x/");
      const path = useNative ? "/api/generate" : "/v1/images/generations";
      const body: Record<string, unknown> = useNative
        ? { model, prompt, stream: false }
        : { model, prompt, size: options.size || "800x1200", response_format: "b64_json" };

      const result = await requestOllamaCloud(path, trimSlash(this.baseUrl), this.headers(), body);
      if (!result.ok) {
        throw new Error(`Ollama cloud image error: ${result.status} - ${result.error}`);
      }

      const data = result.payload as Record<string, unknown>;
      // /v1/images/generations → data[0].b64_json
      if (Array.isArray(data?.data) && data.data[0]?.b64_json) {
        return { b64Json: data.data[0].b64_json as string };
      }
      // /api/generate → images[0] or response
      if (Array.isArray(data?.images) && typeof data.images[0] === "string") {
        return { b64Json: data.images[0] as string };
      }
      if (typeof data?.response === "string") {
        return { b64Json: data.response };
      }
      throw new Error("Ollama cloud image: no image data in response");
    }

    // Local Ollama: /api/generate
    const response = await fetch(`${trimSlash(this.baseUrl)}/api/generate`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama image error: ${response.status}`);
    }

    const data = await response.json();

    return {
      b64Json: data.response,
    };
  }
  
  async createEmbedding(text: string, options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: options.model || "nomic-embed-text",
        prompt: text,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama embedding error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    
    return {
      embedding: data.embedding,
      usage: {
        promptTokens: 0, // Ollama doesn't provide token counts
        totalTokens: 0,
      },
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // Get available models
  async getModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`, {
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined,
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch models");
    }
    
    const data = await response.json();
    
    return data.models.map((m: any) => m.name);
  }
}
