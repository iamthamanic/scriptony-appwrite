/**
 * Generates a project cover image via Ollama Cloud with the dedicated image key.
 * Uses slim DB/auth (no graphql handlers-all) to keep the bundle small and cold starts fast.
 * Location: functions/scriptony-image/ai/image-generate-cover.ts
 */

import {
  OLLAMA_CLOUD_ORIGIN,
  parseSettingsJsonField,
  resolveCoverImageRoute,
} from "../../_shared/ai-feature-profile";
import { fetchAiChatSettingsByUserId } from "../../_shared/image-function-settings-db";
import { requireImageFunctionUser } from "../../_shared/image-function-auth";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";

type ImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};
type OllamaGenerateResponse = {
  response?: string;
  images?: string[];
  error?: string;
};

/** OpenRouter: images via chat/completions + modalities, not /v1/images/generations (404 for Gemini image models). */
type OpenRouterChatImageResponse = {
  choices?: Array<{
    message?: {
      images?: Array<{ image_url?: { url?: string } }>;
    };
  }>;
  error?: { message?: string };
};

/**
 * OpenRouter bills against the requested completion ceiling; image models often default max_tokens
 * to very large values (~32k) if omitted → 402 when credits are tight. Cover needs almost no text.
 */
function openRouterImageMaxTokens(): number {
  const n = Number(process.env.SCRIPTONY_OPENROUTER_IMAGE_MAX_TOKENS);
  if (Number.isFinite(n) && n >= 64 && n <= 8192) return Math.floor(n);
  return 1024;
}

function imageUpstreamTimeoutMs(): number {
  const explicit = Number(process.env.SCRIPTONY_IMAGE_UPSTREAM_TIMEOUT_MS);
  if (Number.isFinite(explicit) && explicit >= 5000) return Math.floor(explicit);
  const raw =
    process.env.APPWRITE_FUNCTION_TIMEOUT ||
    process.env.APPWRITE_TIMEOUT ||
    process.env._APPWRITE_FUNCTION_TIMEOUT;
  if (raw) {
    const sec = Number(raw);
    if (Number.isFinite(sec) && sec > 15) {
      return Math.max(15_000, Math.floor(sec * 1000 - 10_000));
    }
  }
  /** Default when Appwrite does not inject timeout: stay below typical 300s function limit, above slow image APIs. */
  return 280_000;
}

function extractBase64FromDataUrl(dataUrl: string): string | null {
  const m = /^data:image\/[^;]+;base64,(.+)$/is.exec(dataUrl.trim());
  return m ? m[1].trim() : null;
}

function readOpenRouterCoverB64(payload: unknown): string | null {
  const p = payload as OpenRouterChatImageResponse;
  const url = p?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (typeof url !== "string" || !url) return null;
  return extractBase64FromDataUrl(url);
}

function readImageApiKeyFromSettings(raw: unknown, provider: "ollama" | "openrouter"): string | null {
  if (!raw) return null;
  let parsed: any = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const image = parsed?.image ?? {};
  if (provider === "openrouter") {
    const key = typeof image?.openrouter_api_key === "string" ? image.openrouter_api_key.trim() : "";
    return key || null;
  }
  const key =
    typeof image?.ollama_api_key === "string"
      ? image.ollama_api_key.trim()
      : typeof image?.api_key === "string"
        ? image.api_key.trim()
        : "";
  return key || null;
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const user = await requireImageFunctionUser(req.headers.authorization);
    if (!user) {
      sendUnauthorized(res);
      return;
    }
    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const body = await readJsonBody<{ prompt?: string; projectId?: string; model?: string }>(req);
    const prompt = body.prompt?.trim() || "";
    if (!prompt) {
      sendBadRequest(res, "prompt is required");
      return;
    }

    const dbRow = await fetchAiChatSettingsByUserId(user.id);
    const settings = dbRow || {};
    const json = parseSettingsJsonField(settings.settings_json);
    const route = resolveCoverImageRoute(json, body.model?.trim());
    if (!route.ok) {
      sendJson(res, 400, { error: route.error });
      return;
    }
    const { provider, model: selectedModel } = route;
    const imageKey =
      readImageApiKeyFromSettings(settings.settings_json, provider) ||
      (provider === "ollama" && typeof settings.ollama_image_api_key === "string"
        ? settings.ollama_image_api_key.trim()
        : "");
    if (!imageKey) {
      sendJson(res, 400, {
        error:
          provider === "openrouter"
            ? "Kein OpenRouter Image API-Key hinterlegt. Bitte unter KI & LLM → Image speichern."
            : "Kein Ollama Image API-Key hinterlegt. Bitte unter KI & LLM → Image speichern.",
      });
      return;
    }

    const useNativeOllamaImage = provider === "ollama" && selectedModel.startsWith("x/");
    const endpoint =
      provider === "openrouter"
        ? "https://openrouter.ai/api/v1/chat/completions"
        : useNativeOllamaImage
          ? `${OLLAMA_CLOUD_ORIGIN}/api/generate`
          : `${OLLAMA_CLOUD_ORIGIN}/v1/images/generations`;
    const requestBody =
      provider === "openrouter"
        ? {
            model: selectedModel,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
            stream: false,
            max_tokens: openRouterImageMaxTokens(),
            image_config: {
              aspect_ratio: "2:3",
            },
          }
        : useNativeOllamaImage
          ? {
              model: selectedModel,
              prompt,
              stream: false,
            }
          : {
              model: selectedModel,
              prompt,
              size: "800x1200",
              response_format: "b64_json",
            };

    const upstreamMs = imageUpstreamTimeoutMs();
    const ac = new AbortController();
    const timeoutHandle = setTimeout(() => ac.abort(), upstreamMs);
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${imageKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: ac.signal,
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const msg = err instanceof Error ? err.message : String(err);
      if (name === "AbortError" || /aborted|abort/i.test(msg)) {
        sendJson(res, 504, {
          error:
            `Zeitüberschreitung nach ${Math.round(upstreamMs / 1000)}s beim Bild-Provider. ` +
            `Erhöhe das Execution-Timeout für „scriptony-image“ in Appwrite (Functions) und ggf. ` +
            `SCRIPTONY_IMAGE_UPSTREAM_TIMEOUT_MS (ms, z. B. 180000).`,
        });
        return;
      }
      throw err;
    } finally {
      clearTimeout(timeoutHandle);
    }

    const payload = (await response.json().catch(() => ({}))) as
      | (ImageResponse & { error?: { message?: string } })
      | OllamaGenerateResponse
      | OpenRouterChatImageResponse;
    if (!response.ok) {
      const providerMsg =
        typeof (payload as OllamaGenerateResponse)?.error === "string"
          ? (payload as OllamaGenerateResponse).error
          : (payload as { error?: { message?: string } })?.error?.message;
      const routeHint =
        provider === "openrouter"
          ? "openrouter chat/completions (modalities image+text)"
          : useNativeOllamaImage
            ? "/api/generate"
            : "/v1/images/generations";
      sendJson(res, response.status, {
        error:
          providerMsg ||
          `Bildgenerierung fehlgeschlagen (${response.status}) via ${routeHint} mit Modell "${selectedModel}".`,
      });
      return;
    }

    let b64 = "";
    if (provider === "openrouter") {
      b64 = readOpenRouterCoverB64(payload) || "";
    } else {
      const openAiLike = payload as ImageResponse;
      const native = payload as OllamaGenerateResponse;
      const first = Array.isArray(openAiLike.data) ? openAiLike.data[0] : undefined;
      const b64OpenAi = typeof first?.b64_json === "string" ? first.b64_json.trim() : "";
      const b64Native =
        Array.isArray(native.images) && typeof native.images[0] === "string" ? native.images[0].trim() : "";
      b64 = b64OpenAi || b64Native;
    }
    if (!b64) {
      sendJson(res, 502, {
        error: `Provider-Antwort enthält kein Bild (erwartet b64_json oder images[0]) für Modell "${selectedModel}".`,
      });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      project_id: body.projectId || null,
      mime_type: "image/png",
      image_base64: b64,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
