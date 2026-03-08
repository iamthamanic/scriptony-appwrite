/**
 * AI API key validation route for the Nhost compatibility layer.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";
import { getProviderModels } from "./settings";

function detectProvider(apiKey: string): string | null {
  if (apiKey.startsWith("sk-ant-")) return "anthropic";
  if (apiKey.startsWith("AIza")) return "google";
  if (apiKey.startsWith("sk-or-")) return "openrouter";
  if (apiKey.startsWith("sk-")) return "openai";
  if (apiKey.startsWith("ds-") || apiKey.startsWith("sk-ds")) return "deepseek";
  return null;
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  const bootstrap = await requireUserBootstrap(req.headers.authorization);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  const body = await readJsonBody<{ api_key?: string }>(req);
  const apiKey = body.api_key?.trim();
  if (!apiKey) {
    sendBadRequest(res, "api_key is required");
    return;
  }

  const provider = detectProvider(apiKey);
  if (!provider) {
    sendJson(res, 200, { valid: false, error: "Provider konnte nicht erkannt werden" });
    return;
  }

  const models = getProviderModels(provider);
  sendJson(res, 200, {
    valid: true,
    provider,
    default_model: models[0]?.id ?? null,
    models: models.map((entry) => entry.id),
    available_models: models.map((entry) => entry.id),
  });
}
