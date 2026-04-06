/**
 * AI settings routes for the Scriptony HTTP API.
 */

import { getLegacyAssistantSettings, updateLegacyAssistantSettings } from "../../_shared/ai-central-store";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import { getProviderModels } from "./settings-models";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const settings = await getLegacyAssistantSettings(bootstrap.user.id);
      sendJson(res, 200, { settings });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = await readJsonBody<Record<string, unknown>>(req);
      const settings = await updateLegacyAssistantSettings(bootstrap.user.id, body);
      const providerModels = getProviderModels(String(settings.active_provider || "openai"));
      sendJson(res, 200, {
        settings,
        available_models: providerModels.map((entry) => entry.id),
        models_with_context: providerModels,
      });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}

export { getProviderModels } from "./settings-models";
