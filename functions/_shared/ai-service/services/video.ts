/**
 * Video Generation Service
 * 
 * Generates videos from text prompts using configured provider.
 */

import { getProvider, type VideoOptions, type VideoResponse } from "../providers";

interface UserAISettings {
  api_keys: Record<string, string>;
  features: {
    video_generation: {
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
      video_generation: { provider: "openrouter", model: "runway-gen3" },
    },
  };
}

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
  options?: Partial<VideoOptions>
): Promise<VideoResponse> {
  // Load user settings
  const settings = await getUserSettings(userId);
  
  // Get feature configuration
  const featureConfig = settings.features.video_generation;
  
  // Get provider
  const provider = getProvider(featureConfig.provider, {
    apiKey: settings.api_keys[featureConfig.provider],
  });
  
  // Check capability
  if (!provider.capabilities.video || !provider.generateVideo) {
    throw new Error(`Provider "${featureConfig.provider}" does not support video generation`);
  }
  
  // Generate video
  return provider.generateVideo(prompt, {
    model: featureConfig.model,
    ...options,
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
  videoId: string
): Promise<VideoResponse> {
  // Load user settings
  const settings = await getUserSettings(userId);
  
  // Get feature configuration
  const featureConfig = settings.features.video_generation;
  
  // Get provider
  const provider = getProvider(featureConfig.provider, {
    apiKey: settings.api_keys[featureConfig.provider],
  });
  
  // Check capability
  if (!provider.capabilities.video || !provider.getVideoStatus) {
    throw new Error(`Provider "${featureConfig.provider}" does not support video generation`);
  }
  
  // Get status
  return provider.getVideoStatus(videoId);
}

/**
 * Generate a short video (5 seconds)
 */
export async function generateShortVideo(
  userId: string,
  prompt: string
): Promise<VideoResponse> {
  return generateVideo(userId, prompt, {
    duration: 5,
  });
}

/**
 * Generate a video with 16:9 aspect ratio
 */
export async function generateVideoLandscape(
  userId: string,
  prompt: string
): Promise<VideoResponse> {
  return generateVideo(userId, prompt, {
    aspectRatio: "16:9",
  });
}