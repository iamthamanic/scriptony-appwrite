/**
 * AI settings routes for the Scriptony HTTP API.
 */

import { getLegacyAssistantSettings, updateLegacyAssistantSettings } from "../../_shared/ai-central-store";
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
import { getProviderModels } from "./settings-models";

function buildFallbackAssistantSettings(userId: string) {
  return {
    id: `fallback-assistant-settings:${userId}`,
    user_id: userId,
    openai_api_key: null,
    anthropic_api_key: null,
    google_api_key: null,
    openrouter_api_key: null,
    deepseek_api_key: null,
    ollama_api_key: null,
    ollama_base_url: null,
    active_provider: "openai" as const,
    active_model: "gpt-4o-mini",
    system_prompt: "",
    temperature: 0.7,
    max_tokens: 2000,
    use_rag: true,
    settings_json: "{}",
    settings_json_parsed: {},
  };
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      let settings;
      try {
        settings = await getLegacyAssistantSettings(user.id);
      } catch (error) {
        console.warn("[scriptony-assistant] assistant settings fallback", {
          userId: user.id,
          message: error instanceof Error ? error.message : String(error),
        });
        settings = buildFallbackAssistantSettings(user.id);
      }
      sendJson(res, 200, { settings });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = await readJsonBody<Record<string, unknown>>(req);
      const settings = await updateLegacyAssistantSettings(user.id, body);
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
