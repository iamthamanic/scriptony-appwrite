/**
 * HuggingFace Provider Implementation
 * 
 * HuggingFace provides access to thousands of open-source models.
 * Supports:
 * - Text: Multiple text generation models
 * - Audio STT: Whisper, Wav2Vec, etc.
 * - Audio TTS: Bark, Coqui, etc.
 * - Image: Stable Diffusion, Flux, etc.
 * - Video: ModelScope, etc.
 * - Embeddings: Multiple embedding models
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
  VideoOptions,
  VideoResponse,
  EmbeddingOptions,
  EmbeddingResponse,
} from "./base";

export class HuggingFaceProvider implements AIProvider {
  readonly name = "huggingface";
  
  readonly capabilities = {
    text: true,
    audio_stt: true,
    audio_tts: true,
    image: true,
    video: true,
    embeddings: true,
  };
  
  private apiKey: string;
  private baseUrl: string;
  
  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api-inference.huggingface.co/models";
  }
  
  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    // HuggingFace uses different endpoints per model
    const model = options.model || "meta-llama/Llama-3.2-3B-Instruct";
    
    const prompt = messages.map(m => {
      if (m.role === "system") return `<|system|>\n${m.content}</s>\n`;
      if (m.role === "user") return `<|user|>\n${m.content}</s>\n`;
      return `<|assistant|>\n${m.content}</s>\n`;
    }).join("") + "<|assistant|>\n";
    
    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature: options.temperature ?? 0.7,
          max_new_tokens: options.maxTokens ?? 2000,
          top_p: options.topP,
          return_full_text: false,
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HuggingFace chat error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    
    return {
      content: Array.isArray(data) ? data[0].generated_text : data.generated_text,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      model,
      finishReason: "stop",
    };
  }
  
  async transcribe(audioUrl: string, options: STTOptions): Promise<STTResponse> {
    const model = options.model || "openai/whisper-large-v3";
    
    // Download audio
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    
    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "audio/wav",
      },
      body: audioBuffer,
    });
    
    if (!response.ok) {
      throw new Error(`HuggingFace STT error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      text: data.text,
    };
  }
  
  async synthesize(text: string, options: TTSOptions): Promise<TTSResponse> {
    const model = options.model || "suno/bark";
    
    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HuggingFace TTS error: ${response.status}`);
    }
    
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    
    return {
      audioBuffer,
      format: "wav",
    };
  }
  
  async generateImage(prompt: string, options: ImageOptions): Promise<ImageResponse> {
    const model = options.model || "stabilityai/stable-diffusion-xl-base-1.0";
    
    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          negative_prompt: "",
          num_inference_steps: 30,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HuggingFace image error: ${response.status}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    return {
      b64Json: imageBuffer.toString("base64"),
    };
  }
  
  async generateVideo(prompt: string, options: VideoOptions): Promise<VideoResponse> {
    const model = options.model || "ali-vilab/modelscope-damo-text-to-video-synthesis";
    
    // Video generation is async, return job ID
    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HuggingFace video error: ${response.status}`);
    }
    
    return {
      id: `hf-video-${Date.now()}`,
      status: "processing",
    };
  }
  
  async getVideoStatus(videoId: string): Promise<VideoResponse> {
    // HuggingFace doesn't have a standard video status endpoint
    // This would need custom implementation per model
    throw new Error("Video status check not implemented for HuggingFace");
  }
  
  async createEmbedding(text: string, options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const model = options.model || "sentence-transformers/all-MiniLM-L6-v2";
    
    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HuggingFace embedding error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      embedding: Array.isArray(data) ? data[0] : data,
      usage: {
        promptTokens: 0,
        totalTokens: 0,
      },
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch("https://api-inference.huggingface.co/status", {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
