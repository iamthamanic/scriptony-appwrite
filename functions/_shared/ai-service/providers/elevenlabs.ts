/**
 * ElevenLabs Provider Implementation
 *
 * Supports:
 * - Audio TTS: High-quality text-to-speech with multiple voices
 *
 * Note: ElevenLabs specializes in TTS only, no other AI capabilities.
 */

import type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  TTSOptions,
  TTSResponse,
} from "./base";
import { Buffer } from "node:buffer";

export class ElevenLabsProvider implements AIProvider {
  readonly name = "elevenlabs";

  readonly capabilities = {
    text: false,
    audio_stt: false,
    audio_tts: true,
    image: false,
    video: false,
    embeddings: false,
  };

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api.elevenlabs.io/v1";
  }

  async chat(
    _messages: ChatMessage[],
    _options: ChatOptions,
  ): Promise<ChatResponse> {
    throw new Error("ElevenLabs does not support text chat");
  }

  async synthesize(text: string, options: TTSOptions): Promise<TTSResponse> {
    // Default voice: Rachel (premade)
    const voiceId = options.voice || "21m00Tcm4TlvDq8ikWAM"; // Rachel

    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": this.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: options.model || "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS error: ${response.status} - ${error}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return {
      audioBuffer,
      format: "mp3",
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get available voices
  async getVoices(): Promise<
    Array<{ id: string; name: string; category: string }>
  > {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: {
        "xi-api-key": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch voices");
    }

    const data = await response.json();

    return data.voices.map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      category: v.category,
    }));
  }
}
