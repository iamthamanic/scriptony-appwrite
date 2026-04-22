/**
 * Direct Appwrite DB access for ai_chat_settings (scriptony-image only).
 * Location: functions/_shared/image-function-settings-db.ts
 */

import { ID, Query } from "node-appwrite";
import {
  C,
  createDocument,
  listDocumentsFull,
  updateDocument,
} from "./appwrite-db";

const AI_CHAT_SETTINGS_WRITABLE = new Set([
  "user_id",
  "provider",
  "model",
  "settings_json",
  "temperature",
  "system_prompt_default",
  "openai_api_key",
  "anthropic_api_key",
  "google_api_key",
  "openrouter_api_key",
  "deepseek_api_key",
  "ollama_base_url",
  "ollama_api_key",
  "ollama_image_api_key",
  "active_provider",
  "active_model",
  "system_prompt",
  "max_tokens",
  "use_rag",
]);

const AI_CHAT_API_KEY_FIELDS = new Set([
  "openai_api_key",
  "anthropic_api_key",
  "google_api_key",
  "openrouter_api_key",
  "deepseek_api_key",
  "ollama_api_key",
  "ollama_image_api_key",
]);

function sanitizeAiChatSettingsUpdate(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!AI_CHAT_SETTINGS_WRITABLE.has(k)) continue;
    if (v === undefined) continue;
    if (v === null && AI_CHAT_API_KEY_FIELDS.has(k)) {
      out[k] = "";
      continue;
    }
    if (v === null) continue;
    out[k] = v;
  }
  return out;
}

function sanitizeAiChatSettingsInsert(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!AI_CHAT_SETTINGS_WRITABLE.has(k)) continue;
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export type AiChatSettingsRow = Record<string, unknown> & {
  id: string;
  user_id?: string;
  settings_json?: string | null;
  ollama_image_api_key?: string | null;
};

export async function fetchAiChatSettingsByUserId(
  userId: string,
): Promise<AiChatSettingsRow | null> {
  const rows = await listDocumentsFull(
    C.ai_chat_settings,
    [Query.equal("user_id", userId), Query.limit(1)],
    1,
  );
  return (rows[0] as AiChatSettingsRow) ?? null;
}

export async function createDefaultAiChatSettings(
  userId: string,
): Promise<AiChatSettingsRow> {
  const row = await createDocument(
    C.ai_chat_settings,
    ID.unique(),
    sanitizeAiChatSettingsInsert({
      user_id: userId,
      active_provider: "openai",
      active_model: "gpt-4o-mini",
      system_prompt: "",
      temperature: 0.7,
      max_tokens: 2000,
      use_rag: true,
    }),
  );
  return row as AiChatSettingsRow;
}

export async function updateAiChatSettingsById(
  id: string,
  changes: Record<string, unknown>,
): Promise<AiChatSettingsRow> {
  const row = await updateDocument(
    C.ai_chat_settings,
    id,
    sanitizeAiChatSettingsUpdate(changes),
  );
  return row as AiChatSettingsRow;
}
