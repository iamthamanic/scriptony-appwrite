/**
 * Video Generation Service
 *
 * Generates videos from text prompts using configured provider.
 */

import { resolveFeatureRuntime } from "../config/settings";
import {
  getProvider,
  type VideoOptions,
  type VideoResponse,
} from "../providers";

/**
 * Generate a video from a text prompt
 *
 * @param userId - User ID
 * @param prompt - Text prompt
 * @param options - Video options (duration, aspect ratio, etc.)
 * @returns Video generation job info
 */
export async function generateVideo(
  userId: string,
  prompt: string,
  options?: Partial<VideoOptions>,
): Promise<VideoResponse> {
  const runtime = await resolveFeatureRuntime(userId, "video_generation");
  const provider = getProvider(runtime.config.provider, {
    apiKey: runtime.apiKey || undefined,
    baseUrl: runtime.baseUrl,
  });

  // Check capability
  if (!provider.capabilities.video || !provider.generateVideo) {
    throw new Error(
      `Provider "${runtime.config.provider}" does not support video generation`,
    );
  }

  const { model: _ignoredModel, ...rest } = options || {};
  return provider.generateVideo(prompt, {
    ...rest,
    model: runtime.config.model,
  });
}

/**
 * Check video generation status
 *
 * @param userId - User ID
 * @param videoId - Video job ID
 * @returns Video status and URL if complete
 */
export async function getVideoStatus(
  userId: string,
  videoId: string,
): Promise<VideoResponse> {
  const runtime = await resolveFeatureRuntime(userId, "video_generation");
  const provider = getProvider(runtime.config.provider, {
    apiKey: runtime.apiKey || undefined,
    baseUrl: runtime.baseUrl,
  });

  // Check capability
  if (!provider.capabilities.video || !provider.getVideoStatus) {
    throw new Error(
      `Provider "${runtime.config.provider}" does not support video generation`,
    );
  }

  // Get status
  return provider.getVideoStatus(videoId);
}

/**
 * Generate a short video (5 seconds)
 */
export async function generateShortVideo(
  userId: string,
  prompt: string,
  options?: Partial<VideoOptions>,
): Promise<VideoResponse> {
  return generateVideo(userId, prompt, {
    duration: 5,
    ...(options || {}),
  });
}

/**
 * Generate a video with 16:9 aspect ratio
 */
export async function generateVideoLandscape(
  userId: string,
  prompt: string,
  options?: Partial<VideoOptions>,
): Promise<VideoResponse> {
  return generateVideo(userId, prompt, {
    aspectRatio: "16:9",
    ...(options || {}),
  });
}
