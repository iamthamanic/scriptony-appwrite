/**
 * AI settings routes using the central ai-service.
 * GET returns settings; PUT updates feature config for assistant_chat.
 *
 * Location: functions/scriptony-assistant/ai/settings.ts
 */

import { getAISettings, updateFeatureConfig } from "../../_shared/ai-service/config/settings";
import { getModelsForProvider } from "../../_shared/ai-service/config/models";
import { requireAuthenticatedUser } from "../../_shared/auth";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const settings = await getAISettings(user.id);
      sendJson(res, 200, { settings });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = await readJsonBody<{ provider?: string; model?: string; voice?: string }>(req);
      if (body.provider || body.model) {
        await updateFeatureConfig(user.id, "assistant_chat", {
          provider: body.provider || "",
          model: body.model || "",
          voice: body.voice || "",
        });
      }
      const settings = await getAISettings(user.id);
      const providerModels = getModelsForProvider(body.provider || "openai");
      sendJson(res, 200, {
        settings,
        available_models: providerModels.map((m) => m.id),
        models_with_context: providerModels,
      });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}

export { getModelsForProvider } from "../../_shared/ai-service/config/models";