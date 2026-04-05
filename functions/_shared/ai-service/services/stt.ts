/**
 * Speech-to-Text Service (STT)
 * 
 * Transcribes audio to text using configured provider.
 */

import { getProvider, type STTOptions, type STTResponse } from "../providers";

interface UserAISettings {
  api_keys: Record<string, string>;
  features: {
    audio_stt: {
      provider: string;
      model: string;
    };
  };
}

async function getUserSettings(userId: string): Promise<UserAISettings> {
  // Placeholder - implement actual DB lookup
  return {
    api_keys: {},
    features: {
      audio_stt: { provider: "openai", model: "whisper-1" },
    },
  };
}

/**
 * Transcribe audio to text
 * 
 * @param userId - User ID
 * @param audioUrl - URL to audio file
 * @param options - STT options
 * @returns Transcription result
 */
export async function transcribe(
  userId: string,
  audioUrl: string,
  options?: Partial<STTOptions>
): Promise<STTResponse> {
  // Load user settings
  const settings = await getUserSettings(userId);
  
  // Get feature configuration
  const featureConfig = settings.features.audio_stt;
  
  // Get provider
  const provider = getProvider(featureConfig.provider, {
    apiKey: settings.api_keys[featureConfig.provider],
  });
  
  // Check capability
  if (!provider.capabilities.audio_stt || !provider.transcribe) {
    throw new Error(`Provider "${featureConfig.provider}" does not support speech-to-text`);
  }
  
  // Transcribe
  return provider.transcribe(audioUrl, {
    model: featureConfig.model,
    ...options,
  });
}

/**
 * Transcribe with timestamp granularities
 * 
 * @param userId - User ID
 * @param audioUrl - URL to audio file
 * @returns Transcription with word-level timestamps
 */
export async function transcribeWithTimestamps(
  userId: string,
  audioUrl: string
): Promise<STTResponse> {
  return transcribe(userId, audioUrl, {
    timestampGranularities: ["word"],
  });
}