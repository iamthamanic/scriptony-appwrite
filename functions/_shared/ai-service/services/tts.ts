/**
 * Text-to-Speech Service (TTS)
 *
 * Synthesizes text to audio using configured provider.
 */

import { resolveFeatureRuntime } from "../config/settings";
import { getProvider, type TTSOptions, type TTSResponse } from "../providers";

/** OpenAI TTS default voices — single source of truth. */
export const OPENAI_TTS_VOICES = [
  { id: "alloy", name: "Alloy" },
  { id: "echo", name: "Echo" },
  { id: "fable", name: "Fable" },
  { id: "onyx", name: "Onyx" },
  { id: "nova", name: "Nova" },
  { id: "shimmer", name: "Shimmer" },
] as const;

/**
 * Synthesize text to speech
 *
 * @param userId - User ID
 * @param text - Text to synthesize
 * @param options - TTS options (voice, speed, etc.)
 * @returns Audio buffer
 */
export async function synthesize(
  userId: string,
  text: string,
  options?: Partial<TTSOptions>,
): Promise<TTSResponse> {
  const runtime = await resolveFeatureRuntime(userId, "audio_tts");
  const provider = getProvider(runtime.config.provider, {
    apiKey: runtime.apiKey || undefined,
    baseUrl: runtime.baseUrl,
  });

  // Check capability
  if (!provider.capabilities.audio_tts || !provider.synthesize) {
    throw new Error(
      `Provider "${runtime.config.provider}" does not support text-to-speech`,
    );
  }

  const { model: _ignoredModel, voice: _ignoredVoice, ...rest } = options || {};
  return provider.synthesize(text, {
    ...rest,
    model: runtime.config.model,
    voice: runtime.config.voice || options?.voice,
  });
}

/**
 * Get available voices for TTS
 *
 * @param userId - User ID
 * @returns List of available voices
 */
export async function getVoices(
  userId: string,
  options?: { provider?: string },
): Promise<Array<{ id: string; name: string }>> {
  const runtime = await resolveFeatureRuntime(userId, "audio_tts");
  const providerName =
    (options?.provider as typeof runtime.config.provider | undefined) ||
    runtime.config.provider;
  const provider = getProvider(providerName, {
    apiKey: runtime.apiKey || undefined,
    baseUrl: runtime.baseUrl,
  });

  // Check if provider has voice selection
  if (provider.name === "elevenlabs" && "getVoices" in provider) {
    const elevenlabs = provider as any;
    return elevenlabs.getVoices();
  }

  // Default voices for other providers
  if (providerName === "openai") {
    return [...OPENAI_TTS_VOICES];
  }

  return [{ id: "default", name: "Default" }];
}
