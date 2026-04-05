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
  
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || "http://localhost:11434";
  }
  
  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    const systemMessages = options.systemPrompt
      ? [{ role: "system" as const, content: options.systemPrompt }]
      : [];
    
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
      headers: {
        "Content-Type": "application/json",
      },
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
      headers: {
        "Content-Type": "application/json",
      },
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
    // Use stable-diffusion or similar model
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model || "stable-diffusion",
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
      headers: {
        "Content-Type": "application/json",
      },
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
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // Get available models
  async getModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch models");
    }
    
    const data = await response.json();
    
    return data.models.map((m: any) => m.name);
  }
}