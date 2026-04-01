/**
 * Dedicated Image settings route (separate from assistant): stores/reads Ollama image key + image config.
 * Location: functions/scriptony-image/ai/image-settings.ts
 */

import {
  mergeSettingsJson,
  parseSettingsJsonField,
  type AiSettingsJsonV1,
} from "../../_shared/ai-feature-profile";
import { requireImageFunctionUser } from "../../_shared/image-function-auth";
import {
  createDefaultAiChatSettings,
  fetchAiChatSettingsByUserId,
  updateAiChatSettingsById,
} from "../../_shared/image-function-settings-db";
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

type SettingsRow = {
  id: string;
  user_id: string;
  settings_json?: string | null;
};

function parseSettings(raw: unknown): AiSettingsJsonV1 {
  if (typeof raw === "string" && raw.trim()) return parseSettingsJsonField(raw);
  if (raw && typeof raw === "object") return raw as AiSettingsJsonV1;
  return {};
}

function readImageKeyFromSettings(raw: unknown): string {
  const parsed = parseSettings(raw) as AiSettingsJsonV1 & {
    image?: { provider?: "ollama" | "openrouter"; ollama_api_key?: string; openrouter_api_key?: string; api_key?: string };
  };
  const p = parsed?.image?.provider === "openrouter" ? "openrouter" : "ollama";
  const key =
    p === "openrouter"
      ? typeof parsed?.image?.openrouter_api_key === "string"
        ? parsed.image.openrouter_api_key.trim()
        : ""
      : typeof parsed?.image?.ollama_api_key === "string"
        ? parsed.image.ollama_api_key.trim()
        : typeof parsed?.image?.api_key === "string"
          ? parsed.image.api_key.trim()
          : "";
  return key;
}

function withVirtualImageKey(
  row: SettingsRow
): SettingsRow & { ollama_image_api_key: string; openrouter_image_api_key: string; image_provider: "ollama" | "openrouter" } {
  const parsed = parseSettings(row.settings_json) as AiSettingsJsonV1 & {
    image?: { provider?: "ollama" | "openrouter"; ollama_api_key?: string; openrouter_api_key?: string };
  };
  const provider = parsed?.image?.provider === "openrouter" ? "openrouter" : "ollama";
  const ollamaKey = typeof parsed?.image?.ollama_api_key === "string" ? parsed.image.ollama_api_key.trim() : "";
  const openrouterKey =
    typeof parsed?.image?.openrouter_api_key === "string" ? parsed.image.openrouter_api_key.trim() : "";
  return {
    ...row,
    image_provider: provider,
    ollama_image_api_key: provider === "ollama" ? readImageKeyFromSettings(row.settings_json) : ollamaKey,
    openrouter_image_api_key: provider === "openrouter" ? readImageKeyFromSettings(row.settings_json) : openrouterKey,
  };
}

async function getOrCreateImageSettings(userId: string): Promise<SettingsRow> {
  const existing = await fetchAiChatSettingsByUserId(userId);
  if (existing) {
    return {
      id: existing.id,
      user_id: (existing.user_id as string) || userId,
      settings_json: existing.settings_json as string | null | undefined,
    };
  }
  const created = await createDefaultAiChatSettings(userId);
  return {
    id: created.id,
    user_id: (created.user_id as string) || userId,
    settings_json: created.settings_json as string | null | undefined,
  };
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const user = await requireImageFunctionUser(req.headers.authorization);
    if (!user) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const settings = await getOrCreateImageSettings(user.id);
      sendJson(res, 200, { settings: withVirtualImageKey(settings) });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      const existing = await getOrCreateImageSettings(user.id);
      const body = await readJsonBody<Record<string, unknown>>(req);
      const updates: Record<string, unknown> = {};

      let mergedSettings = parseSettings(existing.settings_json);
      if (body.settings_json !== undefined && typeof body.settings_json === "object" && body.settings_json !== null) {
        mergedSettings = mergeSettingsJson(mergedSettings, body.settings_json as Partial<AiSettingsJsonV1>);
      } else if (typeof body.settings_json === "string") {
        mergedSettings = mergeSettingsJson(mergedSettings, parseSettingsJsonField(body.settings_json));
      }
      const provider = body.image_provider === "openrouter" ? "openrouter" : "ollama";
      if (typeof body.ollama_image_api_key === "string" || typeof body.openrouter_image_api_key === "string") {
        const image = { ...(mergedSettings.image || {}) } as Record<string, unknown>;
        image.provider = provider;
        if (typeof body.ollama_image_api_key === "string") image.ollama_api_key = body.ollama_image_api_key.trim();
        if (typeof body.openrouter_image_api_key === "string") {
          image.openrouter_api_key = body.openrouter_image_api_key.trim();
        }
        mergedSettings = { ...mergedSettings, image };
      }
      updates.settings_json = JSON.stringify(mergedSettings);

      const updated = await updateAiChatSettingsById(existing.id, updates);

      sendJson(res, 200, {
        settings: withVirtualImageKey({
          id: updated.id,
          user_id: (updated.user_id as string) || user.id,
          settings_json: updated.settings_json as string | null | undefined,
        }),
      });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}

