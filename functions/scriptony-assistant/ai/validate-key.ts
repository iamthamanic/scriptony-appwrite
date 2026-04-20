/**
 * AI API key validation route using central ai-service.
 * Uses getProvider().healthCheck() for validation and discoverModels() for model listing.
 *
 * Location: functions/scriptony-assistant/ai/validate-key.ts
 */

import { getProvider } from "../../_shared/ai-service/providers";
import { discoverModels } from "../../_shared/ai-service/model-discovery";
import { getModelsForProvider } from "../../_shared/ai-service/config/models";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
} from "../../_shared/http";

const KNOWN_PROVIDERS = [
  "openai",
  "anthropic",
  "google",
  "openrouter",
  "deepseek",
  "ollama",
  "ollama_local",
  "ollama_cloud",
] as const;

function detectProvider(apiKey: string): string | null {
  if (apiKey.startsWith("sk-ant-")) return "anthropic";
  if (apiKey.startsWith("AIza")) return "google";
  if (apiKey.startsWith("sk-or-")) return "openrouter";
  if (apiKey.startsWith("sk-")) return "openai";
  if (apiKey.startsWith("ds-") || apiKey.startsWith("sk-ds")) return "deepseek";
  return null;
}

/** Map "ollama" to the appropriate runtime provider ID based on mode. */
function resolveOllamaProviderId(mode: "local" | "cloud"): string {
  return mode === "cloud" ? "ollama_cloud" : "ollama_local";
}

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
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
  const rawProvider = (body as { Provider?: string }).Provider ?? body.provider;
  const explicit = rawProvider?.trim().toLowerCase();
  let provider: string | null =
    explicit && (KNOWN_PROVIDERS as readonly string[]).includes(explicit)
      ? explicit
      : null;

  const modeRaw = (
    body.ollama_mode ?? (body as { ollamaMode?: string }).ollamaMode
  )
    ?.trim()
    .toLowerCase();

  if (!provider && (modeRaw === "cloud" || modeRaw === "local")) {
    provider = "ollama";
  }

  const apiKey = body.api_key?.trim() || "";

  // Resolve Ollama provider ID to runtime variant
  if (provider === "ollama") {
    const mode: "local" | "cloud" = modeRaw === "cloud" ? "cloud" : "local";
    if (mode === "cloud" && !apiKey) {
      sendBadRequest(res, "api_key is required for ollama cloud");
      return;
    }
    provider = resolveOllamaProviderId(mode);
  }

  if (!provider) {
    if (!apiKey) {
      sendBadRequest(res, "api_key is required");
      return;
    }
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

  // Health check via provider
  const baseUrl = body.base_url?.trim().replace(/\/$/, "") || undefined;
  let valid = false;
  try {
    const prov = getProvider(provider, {
      apiKey: apiKey || undefined,
      baseUrl,
    });
    valid = (await prov.healthCheck()) ?? false;
  } catch {
    valid = false;
  }

  if (!valid) {
    const friendly = provider.startsWith("ollama")
      ? modeRaw === "cloud"
        ? "Ollama Cloud nicht erreichbar. Prüfe den API-Key (ollama.com)."
        : "Ollama nicht erreichbar. Prüfe Basis-URL und Netzwerk."
      : `Key-Validierung für "${provider}" fehlgeschlagen.`;
    sendJson(res, 200, { valid: false, error: friendly });
    return;
  }

  // Discover models
  let discoveredModels: Array<{ id: string; name: string; provider: string }> =
    [];
  try {
    const models = await discoverModels(provider, "assistant_chat", {
      apiKey: apiKey || undefined,
      baseUrl,
    });
    discoveredModels = models.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
    }));
  } catch {
    // Discovery optional — health check passed
  }

  const fallbackModels = getModelsForProvider(provider);
  const usedRemote = discoveredModels.length > 0;
  const finalList = usedRemote
    ? discoveredModels
    : fallbackModels.map((m) => ({ id: m.id, name: m.name, provider }));

  sendJson(res, 200, {
    valid: true,
    provider,
    default_model: finalList[0]?.id ?? null,
    models: finalList.map((e) => e.id),
    available_models: finalList.map((e) => e.id),
    models_with_context: finalList,
    models_with_capabilities: discoveredModels,
    source: usedRemote ? "remote" : "registry",
  });
}
