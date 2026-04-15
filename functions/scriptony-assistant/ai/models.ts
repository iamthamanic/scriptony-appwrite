/**
 * AI models route: lists models per provider (dynamic from vendor APIs when possible).
 * Uses central ai-service for discovery and registry.
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
import { getModelsForProvider } from "../../_shared/ai-service/config/models";
import { listRemoteModels, listRemoteModelsWithCapabilities } from "./fetch-dynamic-models";

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

    const provider = providerFromRequest(req, "openai");
    const ollamaMode = getQuery(req, "ollama_mode")?.trim().toLowerCase();
    const ollamaBaseUrl = getQuery(req, "ollama_base_url")?.trim().replace(/\/$/, "") || "";

    const { models, source } = await listRemoteModels(provider, {
      apiKey: "",
      ollamaBaseUrl: provider.startsWith("ollama") ? ollamaBaseUrl : undefined,
      ollamaMode: provider.startsWith("ollama") ? (ollamaMode === "cloud" ? "cloud" : "local") : undefined,
    });
    const withCaps = await listRemoteModelsWithCapabilities(provider, {
      apiKey: "",
      ollamaBaseUrl: provider.startsWith("ollama") ? ollamaBaseUrl : undefined,
      ollamaMode: provider.startsWith("ollama") ? (ollamaMode === "cloud" ? "cloud" : "local") : undefined,
    });

    const fallbackModels = getModelsForProvider(provider);
    const finalModels = models.length > 0 ? models : fallbackModels;
    sendJson(res, 200, {
      provider,
      models: finalModels.map((m) => m.id),
      models_with_context: finalModels,
      models_with_capabilities: withCaps.models,
      source,
      registry_fallback: models.length === 0 || source === "registry",
      ...(provider.startsWith("ollama") ? { ollama_mode: ollamaMode || "local" } : {}),
    });
  } catch (error) {
    sendServerError(res, error);
  }
}