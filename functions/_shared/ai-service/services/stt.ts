/**
 * Speech-to-Text Service (STT)
 * 
 * Transcribes audio to text using configured provider.
 */

import { resolveFeatureRuntime } from "../config/settings";
import { getProvider, type STTOptions, type STTResponse } from "../providers";

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
  const runtime = await resolveFeatureRuntime(userId, "audio_stt");
  const provider = getProvider(runtime.config.provider, {
    apiKey: runtime.apiKey || undefined,
    baseUrl: runtime.baseUrl,
  });
  
  // Check capability
  if (!provider.capabilities.audio_stt || !provider.transcribe) {
    throw new Error(`Provider "${runtime.config.provider}" does not support speech-to-text`);
  }

  const { model: _ignoredModel, ...rest } = options || {};
  return provider.transcribe(audioUrl, {
    ...rest,
    model: runtime.config.model,
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
