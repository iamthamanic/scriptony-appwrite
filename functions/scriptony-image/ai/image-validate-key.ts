/**
 * Validates an image provider API key using the central ai-service.
 * Uses getProvider().healthCheck() for validation and discoverModels() for model listing.
 *
 * Location: functions/scriptony-image/ai/image-validate-key.ts
 */

import { getProvider } from "../../_shared/ai-service/providers";
import { discoverModels } from "../../_shared/ai-service/model-discovery";
import { requireAuthenticatedUser } from "../../_shared/auth";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
} from "../../_shared/http";

const VALID_IMAGE_PROVIDERS = [
  "ollama",
  "ollama_local",
  "ollama_cloud",
  "openrouter",
] as const;

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const user = await requireAuthenticatedUser(req);
  if (!user) {
    sendUnauthorized(res);
    return;
  }
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  const body = await readJsonBody<{ api_key?: string; provider?: string }>(req);
  const provider = VALID_IMAGE_PROVIDERS.includes(body.provider as any)
    ? body.provider!
    : "ollama";
  const apiKey = body.api_key?.trim() || "";
  if (!apiKey) {
    sendBadRequest(res, "api_key is required");
    return;
  }

  // Validate key via health check
  let valid = false;
  try {
    const prov = getProvider(provider, { apiKey: apiKey });
    valid = (await prov.healthCheck()) ?? false;
  } catch {
    valid = false;
  }

  if (!valid) {
    sendJson(res, 200, {
      valid: false,
      provider,
      error: "Key validation failed",
    });
    return;
  }

  // Discover models for image_generation
  let discoveredModels: Array<{ id: string; name: string; provider: string }> =
    [];
  try {
    const models = await discoverModels(provider, "image_generation", {
      apiKey,
    });
    discoveredModels = models.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
    }));
  } catch {
    // Discovery is optional — health check already passed
  }

  sendJson(res, 200, {
    valid: true,
    provider,
    models_with_capabilities: discoveredModels,
    callable_image_models: discoveredModels.map((m) => m.id),
  });
}
