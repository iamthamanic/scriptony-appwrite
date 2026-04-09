/**
 * AI models route: lists models per provider (dynamic from vendor APIs when possible).
 */

import { requireUserBootstrap } from "../../_shared/auth";
import {
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  getQuery,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import { getLegacyAssistantSettings } from "../../_shared/ai-central-store";
import { inferOllamaMode, parseSettingsJsonField } from "../../_shared/ai-feature-profile";
import { listRemoteModels, listRemoteModelsWithCapabilities } from "./fetch-dynamic-models";
import { getProviderModels } from "./settings-models";

function providerFromRequest(req: RequestLike, fallback: string): string {
  const q = getQuery(req, "provider")?.trim().toLowerCase();
  if (q) return q;
  const raw = (typeof req?.url === "string" && req.url) || "";
  try {
    const u = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : new URL(raw, "http://local");
    const p = u.searchParams.get("provider")?.trim().toLowerCase();
    if (p) return p;
  } catch {
    /* ignore */
  }
  return fallback;
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const row = await getLegacyAssistantSettings(bootstrap.user.id);
    const active = (typeof row.active_provider === "string" && row.active_provider) || "openai";
    const provider = providerFromRequest(req, active);

    const str = (k: string) => (typeof row[k] === "string" ? (row[k] as string).trim() : "");

    let apiKey = "";
    if (provider === "openai") apiKey = str("openai_api_key");
    else if (provider === "anthropic") apiKey = str("anthropic_api_key");
    else if (provider === "google") apiKey = str("google_api_key");
    else if (provider === "openrouter") apiKey = str("openrouter_api_key");
    else if (provider === "deepseek") apiKey = str("deepseek_api_key");
    else if (provider === "ollama") apiKey = str("ollama_api_key");

    const json = parseSettingsJsonField(row.settings_json);
    const inferredOllamaMode = inferOllamaMode(row, json);
    const qMode = getQuery(req, "ollama_mode")?.trim().toLowerCase();
    const ollamaMode =
      provider === "ollama" && (qMode === "cloud" || qMode === "local") ? qMode : inferredOllamaMode;

    const baseOverride = getQuery(req, "ollama_base_url")?.trim().replace(/\/$/, "") || "";
    const ollamaBaseUrl =
      provider === "ollama" && ollamaMode === "local"
        ? baseOverride || str("ollama_base_url").replace(/\/$/, "")
        : "";

    const { models, source } = await listRemoteModels(provider, {
      apiKey,
      ollamaBaseUrl: provider === "ollama" ? ollamaBaseUrl : undefined,
      ollamaMode: provider === "ollama" ? ollamaMode : undefined,
    });
    const withCaps = await listRemoteModelsWithCapabilities(provider, {
      apiKey,
      ollamaBaseUrl: provider === "ollama" ? ollamaBaseUrl : undefined,
      ollamaMode: provider === "ollama" ? ollamaMode : undefined,
    });

    const fallbackModels = getProviderModels(provider);
    const finalModels = models.length > 0 ? models : fallbackModels;
    sendJson(res, 200, {
      provider,
      models: finalModels.map((m) => m.id),
      models_with_context: finalModels,
      models_with_capabilities: withCaps.models,
      source,
      registry_fallback: models.length === 0 || source === "registry",
      ...(provider === "ollama" ? { ollama_mode: ollamaMode } : {}),
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
