/**
 * Appwrite function entrypoint: scriptony-ai.
 *
 * Central control plane for AI configuration stored in Appwrite DB `scriptony_ai`.
 */

import {
  type CanonicalAiFeature,
  getFeatureConfig,
  getFeatureConfigMap,
  getLegacyAssistantSettings,
  getLegacyImageSettings,
  getStoredApiKey,
  getUserSettings,
  listMaskedApiKeys,
  updateApiKey,
  updateFeatureConfig,
  updateLegacyAssistantSettings,
  updateLegacyImageSettings,
} from "../_shared/ai-central-store";
import { getFeatureRuntimeView } from "../_shared/ai-feature-runtime-view";
import { requireUserBootstrap } from "../_shared/auth";
import { createAppwriteHandler } from "../_shared/appwrite-handler";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../_shared/http";
import { getModelsForProvider } from "../_shared/ai-service/config";
import { discoverModels } from "../_shared/ai-service/model-discovery";
import { OLLAMA_CLOUD_ORIGIN } from "../_shared/ai-feature-profile";
import {
  getProvider,
  isOllamaFamilyProvider,
  PROVIDER_CAPABILITIES,
  PROVIDER_DISPLAY_NAMES,
} from "../_shared/ai-service/providers";
import { fetchOllamaTags } from "../_shared/ollama-tags-request";
import { fetchOllamaV1Models } from "../_shared/ollama-v1-models-request";
// Legacy assistant dispatch removed — gateway now routes /ai/chat, /ai/settings, etc.
// directly to scriptony-assistant. See assistant-legacy.ts for history.
// import { dispatchAssistantLegacyRoute } from "./assistant-legacy";

async function ensureFetchPolyfillLoaded(): Promise<void> {
  await import("../_shared/fetch-polyfill");
}

function getPathname(req: RequestLike): string {
  const direct = (typeof req?.path === "string" && req.path) ||
    (typeof req?.url === "string" && req.url) ||
    "/";
  try {
    if (direct.startsWith("http://") || direct.startsWith("https://")) {
      return new URL(direct).pathname || "/";
    }
  } catch {
    /* fallback */
  }
  const q = direct.indexOf("?");
  return q >= 0 ? direct.slice(0, q) : direct;
}

function getQueryParam(req: RequestLike, key: string): string {
  const fromQuery = req?.query?.[key];
  if (typeof fromQuery === "string" && fromQuery.trim()) {
    return fromQuery.trim();
  }
  try {
    const raw = typeof req?.url === "string" ? req.url : "";
    const url = raw.startsWith("http://") || raw.startsWith("https://")
      ? new URL(raw)
      : new URL(raw, "http://local");
    return url.searchParams.get(key)?.trim() || "";
  } catch {
    return "";
  }
}

async function buildSettingsPayload(
  userId: string,
): Promise<Record<string, unknown>> {
  const [user, features, api_keys, assistant, image] = await Promise.all([
    getUserSettings(userId),
    getFeatureConfigMap(userId),
    listMaskedApiKeys(userId),
    getLegacyAssistantSettings(userId),
    getLegacyImageSettings(userId),
  ]);

  const feature_provider_keys = Object.fromEntries(
    api_keys
      .filter((entry) => entry.feature !== "global")
      .map((entry) => [`${entry.feature}:${entry.provider}`, true] as const),
  );
  const providerKeyIndex = api_keys.reduce<Record<string, boolean>>(
    (acc, entry) => {
      acc[entry.provider] = true;
      return acc;
    },
    {},
  );

  // Build legacy API key fields for backward compatibility
  const legacyApiKeys: Record<string, string | null> = {};
  for (const entry of api_keys) {
    if (entry.feature === "global") continue;
    // Map provider to legacy field name
    const legacyField = `${entry.provider}_api_key`;
    legacyApiKeys[legacyField] = entry.key_preview || "configured";
  }

  return {
    user,
    features,
    api_keys: providerKeyIndex,
    api_key_rows: api_keys,
    feature_provider_keys,
    assistant,
    image,
    // Include legacy API key fields for backward compatibility
    ...legacyApiKeys,
    providers: Object.entries(PROVIDER_CAPABILITIES).map(([name, caps]) => ({
      id: name,
      name: PROVIDER_DISPLAY_NAMES[name] || name,
      capabilities: caps,
      requiresApiKey: !isOllamaFamilyProvider(name),
      has_key: isOllamaFamilyProvider(name) || Boolean(providerKeyIndex[name]),
    })),
  };
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const pathname = getPathname(req);

    if (pathname === "/" || pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        service: "scriptony-ai",
        provider: "appwrite",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Legacy assistant routes (/ai/chat, /ai/settings, /ai/models, …) are now
    // routed by the gateway directly to scriptony-assistant. No proxy needed here.

    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }
    const userId = bootstrap.user.id;

    if (pathname === "/providers") {
      if (req.method !== "GET") {
        sendMethodNotAllowed(res, ["GET"]);
        return;
      }
      sendJson(res, 200, {
        providers: Object.entries(PROVIDER_CAPABILITIES).map(
          ([name, caps]) => ({
            id: name,
            name: PROVIDER_DISPLAY_NAMES[name] || name,
            capabilities: caps,
            requiresApiKey: !isOllamaFamilyProvider(name),
          }),
        ),
      });
      return;
    }

    const providerModelsMatch = pathname.match(
      /^\/providers\/([^/]+)\/models$/,
    );
    if (providerModelsMatch) {
      if (req.method !== "GET") {
        sendMethodNotAllowed(res, ["GET"]);
        return;
      }
      const provider = providerModelsMatch[1];
      sendJson(res, 200, { provider, models: getModelsForProvider(provider) });
      return;
    }

    const providerDiscoverMatch = pathname.match(
      /^\/providers\/([^/]+)\/models\/discover$/,
    );
    if (providerDiscoverMatch) {
      if (req.method !== "POST") {
        sendMethodNotAllowed(res, ["POST"]);
        return;
      }
      await ensureFetchPolyfillLoaded();
      const provider = providerDiscoverMatch[1];
      const body = await readJsonBody<{
        feature?: string;
        api_key?: string;
        base_url?: string;
      }>(req);
      if (!body.feature) {
        sendBadRequest(res, "feature is required");
        return;
      }
      const apiKey = body.api_key?.trim() ||
        (await getStoredApiKey(
          userId,
          body.feature as CanonicalAiFeature,
          provider as any,
        )) ||
        undefined;
      const models = await discoverModels(provider, body.feature, {
        apiKey,
        baseUrl: body.base_url?.trim() || undefined,
      });
      sendJson(res, 200, { provider, feature: body.feature, models });
      return;
    }

    const providerValidateMatch = pathname.match(
      /^\/providers\/([^/]+)\/validate$/,
    );
    if (providerValidateMatch) {
      if (req.method !== "POST") {
        sendMethodNotAllowed(res, ["POST"]);
        return;
      }
      await ensureFetchPolyfillLoaded();
      const provider = providerValidateMatch[1];
      const body = await readJsonBody<{
        api_key?: string;
        base_url?: string;
        feature?: CanonicalAiFeature;
      }>(req);
      const apiKey = body.api_key?.trim() ||
        (body.feature
          ? (await getStoredApiKey(userId, body.feature, provider as any)) || ""
          : "");

      if (provider === "ollama_cloud") {
        const base = body.base_url?.trim() || OLLAMA_CLOUD_ORIGIN;
        const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
        const v1 = await fetchOllamaV1Models(base, headers);
        const tags = await fetchOllamaTags(base, headers);
        const valid = v1.ok || tags.ok;
        sendJson(res, 200, {
          provider,
          valid,
          message: valid
            ? "Ollama Cloud connection is valid"
            : "Ollama Cloud validation failed",
          ...(valid ? {} : {
            error: v1.status > 0 || tags.status > 0
              ? [
                v1.ok ? null : `v1/models: ${v1.status || 0} ${v1.error}`,
                tags.ok ? null : `api/tags: ${tags.status || 0} ${tags.error}`,
              ]
                .filter(Boolean)
                .join(" | ")
              : v1.error || tags.error || "Validation failed",
          }),
        });
        return;
      }

      if (provider === "ollama" || provider === "ollama_local") {
        const base = body.base_url?.trim() || "http://127.0.0.1:11434";
        const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
        const tags = await fetchOllamaTags(base, headers);
        sendJson(res, 200, {
          provider,
          valid: tags.ok,
          message: tags.ok
            ? "Ollama connection is valid"
            : "Ollama validation failed",
          ...(tags.ok ? {} : {
            error: tags.status > 0
              ? `api/tags: ${tags.status} ${tags.error}`
              : tags.error || "Validation failed",
          }),
        });
        return;
      }

      try {
        const instance = getProvider(provider, {
          apiKey: apiKey || undefined,
          baseUrl: body.base_url?.trim() || undefined,
          siteUrl: "https://scriptony.app",
          siteName: "Scriptony",
        });
        const valid = (await instance.healthCheck?.()) ?? true;
        sendJson(res, 200, {
          provider,
          valid,
          message: valid ? "API key is valid" : "API key validation failed",
        });
      } catch (error) {
        sendJson(res, 200, {
          provider,
          valid: false,
          error: error instanceof Error ? error.message : "Validation failed",
        });
      }
      return;
    }

    if (pathname === "/api-keys") {
      if (req.method === "GET") {
        sendJson(res, 200, { api_keys: await listMaskedApiKeys(userId) });
        return;
      }

      if (req.method === "POST") {
        const body = await readJsonBody<{
          feature?: CanonicalAiFeature | "";
          provider?: string;
          api_key?: string;
        }>(req);
        if (!body.provider) {
          sendBadRequest(res, "provider is required");
          return;
        }
        await updateApiKey(
          userId,
          (body.feature || "") as CanonicalAiFeature | "",
          body.provider as any,
          body.api_key || null,
        );
        sendJson(res, 200, { success: true });
        return;
      }

      sendMethodNotAllowed(res, ["GET", "POST"]);
      return;
    }

    const scopedApiKeyDeleteMatch = pathname.match(
      /^\/api-keys\/([^/]+)\/([^/]+)$/,
    );
    if (scopedApiKeyDeleteMatch) {
      if (req.method !== "DELETE") {
        sendMethodNotAllowed(res, ["DELETE"]);
        return;
      }
      await updateApiKey(
        userId,
        scopedApiKeyDeleteMatch[1] as CanonicalAiFeature,
        scopedApiKeyDeleteMatch[2] as any,
        null,
      );
      sendJson(res, 200, { success: true });
      return;
    }

    const apiKeyDeleteMatch = pathname.match(/^\/api-keys\/([^/]+)$/);
    if (apiKeyDeleteMatch) {
      if (req.method !== "DELETE") {
        sendMethodNotAllowed(res, ["DELETE"]);
        return;
      }
      const feature = (getQueryParam(req, "feature") || "") as
        | CanonicalAiFeature
        | "";
      await updateApiKey(userId, feature, apiKeyDeleteMatch[1] as any, null);
      sendJson(res, 200, { success: true });
      return;
    }

    if (pathname === "/features") {
      if (req.method !== "GET") {
        sendMethodNotAllowed(res, ["GET"]);
        return;
      }
      sendJson(res, 200, { features: await getFeatureConfigMap(userId) });
      return;
    }

    const featureRuntimeMatch = pathname.match(
      /^\/features\/([^/]+)\/runtime$/,
    );
    if (featureRuntimeMatch) {
      if (req.method !== "GET") {
        sendMethodNotAllowed(res, ["GET"]);
        return;
      }
      await ensureFetchPolyfillLoaded();
      const feature = featureRuntimeMatch[1] as CanonicalAiFeature;
      const includeModels = getQueryParam(req, "include_models") !== "false";
      sendJson(
        res,
        200,
        await getFeatureRuntimeView(userId, feature, { includeModels }),
      );
      return;
    }

    const featureMatch = pathname.match(/^\/features\/([^/]+)$/);
    if (featureMatch) {
      const feature = featureMatch[1] as CanonicalAiFeature;

      if (req.method === "GET") {
        // Get single feature config
        const config = await getFeatureConfig(userId, feature);
        sendJson(res, 200, { feature, config });
        return;
      }

      if (req.method === "PUT") {
        const body = await readJsonBody<{
          provider?: string;
          model?: string;
          voice?: string;
        }>(req);
        if (!body.provider || !body.model) {
          sendBadRequest(res, "provider and model are required");
          return;
        }
        await updateFeatureConfig(userId, feature, {
          provider: body.provider as any,
          model: body.model,
          ...(body.voice ? { voice: body.voice } : {}),
        });
        if (feature === "assistant_chat") {
          await updateLegacyAssistantSettings(userId, {
            active_provider: body.provider,
            active_model: body.model,
          });
        }
        sendJson(res, 200, {
          success: true,
          feature,
          config: await getFeatureConfigMap(userId),
        });
        return;
      }

      sendMethodNotAllowed(res, ["GET", "PUT"]);
      return;
    }

    if (pathname === "/settings") {
      if (req.method === "GET") {
        sendJson(res, 200, await buildSettingsPayload(userId));
        return;
      }

      if (req.method === "PUT" || req.method === "POST") {
        const body = await readJsonBody<Record<string, unknown>>(req);

        if (
          "active_provider" in body ||
          "active_model" in body ||
          "system_prompt" in body ||
          "temperature" in body ||
          "max_tokens" in body ||
          "use_rag" in body ||
          "ollama_base_url" in body ||
          "ollama_api_key" in body ||
          "openai_api_key" in body ||
          "anthropic_api_key" in body ||
          "google_api_key" in body ||
          "openrouter_api_key" in body ||
          "deepseek_api_key" in body ||
          "settings_json" in body
        ) {
          await updateLegacyAssistantSettings(userId, body);
        }

        if (
          "image_provider" in body ||
          "ollama_image_api_key" in body ||
          "openrouter_image_api_key" in body
        ) {
          await updateLegacyImageSettings(userId, body);
        }

        if (body.features && typeof body.features === "object") {
          await Promise.all(
            Object.entries(
              body.features as Record<
                string,
                { provider?: string; model?: string; voice?: string }
              >,
            ).map(async ([feature, config]) => {
              if (!config?.provider || !config?.model) return;
              await updateFeatureConfig(userId, feature as CanonicalAiFeature, {
                provider: config.provider as any,
                model: config.model,
                ...(config.voice ? { voice: config.voice } : {}),
              });
            }),
          );
        }

        if (body.api_keys && typeof body.api_keys === "object") {
          await Promise.all(
            Object.entries(
              body.api_keys as Record<
                string,
                {
                  feature?: CanonicalAiFeature | "";
                  provider?: string;
                  api_key?: string;
                }
              >,
            ).map(async ([provider, entry]) => {
              if (!provider) return;
              await updateApiKey(
                userId,
                (entry?.feature || "") as CanonicalAiFeature | "",
                provider as any,
                entry?.api_key || null,
              );
            }),
          );
        }

        sendJson(res, 200, await buildSettingsPayload(userId));
        return;
      }

      sendMethodNotAllowed(res, ["GET", "PUT", "POST"]);
      return;
    }

    // -------------------------------------------------------------------------
    // /ai/route-request — internal routing introspection (Puppet-Layer Ticket 2)
    // Returns which backend function the gateway would resolve a given path to.
    // Usage: POST /ai/route-request  { "path": "/ai/style/profiles" }
    //        → { "path": "/ai/style/profiles", "function": "scriptony-style" }
    // -------------------------------------------------------------------------
    if (pathname === "/ai/route-request") {
      if (req.method !== "POST") {
        sendMethodNotAllowed(res, ["POST"]);
        return;
      }
      const body = await readJsonBody<{ path?: string }>(req);
      if (!body.path || typeof body.path !== "string") {
        sendBadRequest(res, "path is required (string)");
        return;
      }
      // Canonical route → function mapping (mirrors ROUTE_MAP in api-gateway.ts).
      // Must stay in sync with the gateway; if the map grows further, extract to _shared.
      const ROUTE_PREFIXES: [string, string][] = [
        // Puppet-Layer surfaces
        ["/ai/image", "scriptony-image"],
        ["/ai/jobs", "scriptony-stage"],
        ["/ai/stage2d", "scriptony-stage2d"],
        ["/ai/stage3d", "scriptony-stage3d"],
        ["/ai/stage", "scriptony-stage"],
        ["/ai/style", "scriptony-style"],
        ["/ai/sync", "scriptony-sync"],
        // Assistant — canonical + legacy paths
        ["/ai/assistant", "scriptony-assistant"],
        ["/ai/chat", "scriptony-assistant"],
        ["/ai/conversations", "scriptony-assistant"],
        ["/ai/rag", "scriptony-assistant"],
        ["/ai/settings", "scriptony-assistant"],
        ["/ai/models", "scriptony-assistant"],
        ["/ai/validate-key", "scriptony-assistant"],
        ["/ai/count-tokens", "scriptony-assistant"],
        ["/ai/gym", "scriptony-assistant"],
      ];
      const sorted = ROUTE_PREFIXES.sort((a, b) => b[0].length - a[0].length);
      const match = sorted.find(([prefix]) => body.path!.startsWith(prefix));
      sendJson(res, 200, {
        path: body.path,
        function: match ? match[1] : "scriptony-ai",
      });
      return;
    }

    sendNotFound(res, `Route not found in scriptony-ai: ${pathname}`);
  } catch (error) {
    sendServerError(res, error);
  }
}

export default createAppwriteHandler(dispatch);
