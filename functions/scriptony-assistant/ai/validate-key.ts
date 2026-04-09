/**
 * AI API key validation route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import { OLLAMA_CLOUD_ORIGIN } from "../../_shared/ai-feature-profile";
import { fetchOllamaTags } from "../../_shared/ollama-tags-request";
import { getProviderModels } from "./settings";
import { listRemoteModels, listRemoteModelsWithCapabilities } from "./fetch-dynamic-models";

const KNOWN_PROVIDERS = ["openai", "anthropic", "google", "openrouter", "deepseek", "ollama"] as const;

function detectProvider(apiKey: string): string | null {
  if (apiKey.startsWith("sk-ant-")) return "anthropic";
  if (apiKey.startsWith("AIza")) return "google";
  if (apiKey.startsWith("sk-or-")) return "openrouter";
  if (apiKey.startsWith("sk-")) return "openai";
  if (apiKey.startsWith("ds-") || apiKey.startsWith("sk-ds")) return "deepseek";
  return null;
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  const body = await readJsonBody<{
    api_key?: string;
    provider?: string;
    base_url?: string;
    ollama_mode?: string;
  }>(req);
  // Some proxies/clients send alternate casing; Appwrite may also reshape body.
  const rawProvider = (body as { provider?: string; Provider?: string }).provider ??
    (body as { Provider?: string }).Provider;
  const explicit = rawProvider?.trim().toLowerCase();
  let provider: string | null =
    explicit && (KNOWN_PROVIDERS as readonly string[]).includes(explicit) ? explicit : null;

  const modeRaw = (
    body.ollama_mode ??
    (body as { ollamaMode?: string; Ollama_mode?: string }).ollamaMode ??
    (body as { Ollama_mode?: string }).Ollama_mode
  )
    ?.trim()
    .toLowerCase();
  if (!provider && (modeRaw === "cloud" || modeRaw === "local")) {
    provider = "ollama";
  }

  if (provider === "ollama") {
    const mode: "local" | "cloud" = modeRaw === "cloud" ? "cloud" : "local";
    const apiKey = body.api_key?.trim() || "";

    if (mode === "cloud") {
      if (!apiKey) {
        sendBadRequest(res, "api_key is required for ollama cloud");
        return;
      }
      const base = OLLAMA_CLOUD_ORIGIN.replace(/\/$/, "");
      const tags = await fetchOllamaTags(base, { Authorization: `Bearer ${apiKey}` });
      if (!tags.ok) {
        sendJson(res, 200, {
          valid: false,
          error:
            tags.status > 0
              ? `Ollama Cloud nicht erreichbar (${tags.status}). Prüfe den API-Key (ollama.com).`
              : `Ollama Cloud konnte nicht abgefragt werden: ${tags.error}`,
        });
        return;
      }
    } else {
      const base = body.base_url?.trim().replace(/\/$/, "") || "";
      if (!base) {
        sendBadRequest(res, "base_url is required for ollama local");
        return;
      }
      const hdrs: Record<string, string> = {};
      if (apiKey) hdrs["Authorization"] = `Bearer ${apiKey}`;
      const tagsLocal = await fetchOllamaTags(base, hdrs);
      if (!tagsLocal.ok) {
        sendJson(res, 200, {
          valid: false,
          error:
            tagsLocal.status > 0
              ? `Ollama nicht erreichbar (${tagsLocal.status}). Prüfe Basis-URL und Netzwerk (Function muss den Host erreichen können).`
              : `Ollama-Basis-URL konnte nicht abgefragt werden: ${tagsLocal.error}`,
        });
        return;
      }
    }

    const baseLocal = body.base_url?.trim().replace(/\/$/, "") || "";
    const { models, source } = await listRemoteModels("ollama", {
      apiKey,
      ollamaBaseUrl: mode === "local" ? baseLocal : "",
      ollamaMode: mode,
    });
    const caps = await listRemoteModelsWithCapabilities("ollama", {
      apiKey,
      ollamaBaseUrl: mode === "local" ? baseLocal : "",
      ollamaMode: mode,
    });
    sendJson(res, 200, {
      valid: true,
      provider: "ollama",
      default_model: models[0]?.id ?? null,
      models: models.map((e) => e.id),
      available_models: models.map((e) => e.id),
      models_with_context: models,
      models_with_capabilities: caps.models,
      source,
    });
    return;
  }

  const apiKey = body.api_key?.trim();
  if (!apiKey) {
    sendBadRequest(res, "api_key is required");
    return;
  }

  if (!provider) {
    provider = detectProvider(apiKey);
  }
  if (!provider) {
    sendJson(res, 200, {
      valid: false,
      error:
        "Wähle den Anbieter in der Liste oder nutze ein Key-Format (z. B. sk-ant-… Anthropic, AIza… Google).",
    });
    return;
  }

  const { models, source } = await listRemoteModels(provider, { apiKey });
  const caps = await listRemoteModelsWithCapabilities(provider, { apiKey });
  const fallback = getProviderModels(provider);
  const usedRemote = models.length > 0;
  const finalList = usedRemote ? models : fallback;
  const outSource = usedRemote ? source : "registry";
  sendJson(res, 200, {
    valid: true,
    provider,
    default_model: finalList[0]?.id ?? null,
    models: finalList.map((entry) => entry.id),
    available_models: finalList.map((entry) => entry.id),
    models_with_context: finalList,
    models_with_capabilities: caps.models,
    source: outSource,
  });
}
