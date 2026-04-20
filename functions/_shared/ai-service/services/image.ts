/**
 * Image Generation Service
 *
 * Generates images from text prompts using configured provider.
 */

import { resolveFeatureRuntime } from "../config/settings";
import {
  getProvider,
  type ImageOptions,
  type ImageResponse,
} from "../providers";

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
  options?: Partial<ImageOptions>,
): Promise<ImageResponse> {
  const runtime = await resolveFeatureRuntime(userId, "image_generation");
  const provider = getProvider(runtime.config.provider, {
    apiKey: runtime.apiKey || undefined,
    baseUrl: runtime.baseUrl,
  });

  // Check capability
  if (!provider.capabilities.image || !provider.generateImage) {
    throw new Error(
      `Provider "${runtime.config.provider}" does not support image generation`,
    );
  }

  const { model: _ignoredModel, ...rest } = options || {};
  return provider.generateImage(prompt, {
    ...rest,
    model: runtime.config.model,
  });
}

/**
 * Generate an image with specific size
 */
export async function generateImageHD(
  userId: string,
  prompt: string,
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
  prompt: string,
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
  prompt: string,
): Promise<ImageResponse> {
  return generateImage(userId, prompt, {
    size: "1024x1792",
  });
}
