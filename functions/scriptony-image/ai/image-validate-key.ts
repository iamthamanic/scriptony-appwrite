/**
 * Validates the dedicated Ollama Cloud image API key.
 * Location: functions/scriptony-image/ai/image-validate-key.ts
 */

import { requireImageFunctionUser } from "../../_shared/image-function-auth";
import { fetchUnifiedModels, toLegacyModelRows } from "../../_shared/model-capabilities";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  const user = await requireImageFunctionUser(req.headers.authorization);
  if (!user) {
    sendUnauthorized(res);
    return;
  }
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  const body = await readJsonBody<{ api_key?: string; provider?: "ollama" | "openrouter" }>(req);
  const provider = body.provider === "openrouter" ? "openrouter" : "ollama";
  const apiKey = body.api_key?.trim() || "";
  if (!apiKey) {
    sendBadRequest(res, "api_key is required");
    return;
  }
  const { models, source } = await fetchUnifiedModels({
    provider,
    apiKey,
    ollamaMode: "cloud",
  });
  const models_with_context = toLegacyModelRows(models);
  const callableOnly = models.filter((m) => m.image_gen === "true");

  sendJson(res, 200, {
    valid: true,
    provider,
    mode: provider === "ollama" ? "cloud" : undefined,
    source,
    models_with_context,
    models_with_capabilities: models,
    callable_image_models: callableOnly.map((m) => m.model_id),
  });
}

