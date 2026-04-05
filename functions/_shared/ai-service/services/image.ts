/**
 * Image Generation Service
 * 
 * Generates images from text prompts using configured provider.
 */

import { getProvider, type ImageOptions, type ImageResponse } from "../providers";

interface UserAISettings {
  api_keys: Record<string, string>;
  features: {
    image_generation: {
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
      image_generation: { provider: "openai", model: "dall-e-3" },
    },
  };
}

/**
 * Generate an image from a text prompt
 * 
 * @param userId - User ID
 * @param prompt - Text prompt
 * @param options - Image options (size, quality, etc.)
 * @returns Generated image URL or base64
 */
export async function generateImage(
  userId: string,
  prompt: string,
  options?: Partial<ImageOptions>
): Promise<ImageResponse> {
  // Load user settings
  const settings = await getUserSettings(userId);
  
  // Get feature configuration
  const featureConfig = settings.features.image_generation;
  
  // Get provider
  const provider = getProvider(featureConfig.provider, {
    apiKey: settings.api_keys[featureConfig.provider],
  });
  
  // Check capability
  if (!provider.capabilities.image || !provider.generateImage) {
    throw new Error(`Provider "${featureConfig.provider}" does not support image generation`);
  }
  
  // Generate image
  return provider.generateImage(prompt, {
    model: featureConfig.model,
    ...options,
  });
}

/**
 * Generate an image with specific size
 */
export async function generateImageHD(
  userId: string,
  prompt: string
): Promise<ImageResponse> {
  return generateImage(userId, prompt, {
    quality: "hd",
    size: "1024x1024",
  });
}

/**
 * Generate a landscape image
 */
export async function generateImageLandscape(
  userId: string,
  prompt: string
): Promise<ImageResponse> {
  return generateImage(userId, prompt, {
    size: "1792x1024",
  });
}

/**
 * Generate a portrait image
 */
export async function generateImagePortrait(
  userId: string,
  prompt: string
): Promise<ImageResponse> {
  return generateImage(userId, prompt, {
    size: "1024x1792",
  });
}