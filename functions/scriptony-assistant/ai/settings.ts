/**
 * AI settings routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import {
  DEFAULT_ASSISTANT_SYSTEM_PROMPT,
  mergeSettingsJson,
  normalizeAssistantSystemPrompt,
  parseSettingsJsonField,
  type AiSettingsJsonV1,
} from "../../_shared/ai-feature-profile";

function publicAiSettingsPayload(settings: Record<string, unknown>): Record<string, unknown> {
  const out = { ...settings } as Record<string, unknown>;
  if (typeof out.settings_json === "string") {
    out.settings_json_parsed = parseSettingsJsonField(out.settings_json);
  }
  out.system_prompt = normalizeAssistantSystemPrompt(
    typeof out.system_prompt === "string" ? out.system_prompt : null
  );
  return out;
}

const DEFAULT_SETTINGS = {
  openai_api_key: null,
  anthropic_api_key: null,
  google_api_key: null,
  openrouter_api_key: null,
  deepseek_api_key: null,
  ollama_base_url: null,
  ollama_api_key: null,
  active_provider: "openai",
  active_model: "gpt-4o-mini",
  system_prompt: DEFAULT_ASSISTANT_SYSTEM_PROMPT,
  temperature: 0.7,
  max_tokens: 2000,
  use_rag: true,
};

async function getOrCreateSettings(userId: string): Promise<Record<string, any>> {
  const existing = await requestGraphql<{
    ai_chat_settings: Array<Record<string, any>>;
  }>(
    `
      query GetAiSettings($userId: uuid!) {
        ai_chat_settings(where: { user_id: { _eq: $userId } }, limit: 1) {
          id
          user_id
          openai_api_key
          anthropic_api_key
          google_api_key
          openrouter_api_key
          deepseek_api_key
          ollama_base_url
          ollama_api_key
          active_provider
          active_model
          system_prompt
          temperature
          max_tokens
          use_rag
          settings_json
          created_at
          updated_at
        }
      }
    `,
    { userId }
  );

  if (existing.ai_chat_settings[0]) {
    return existing.ai_chat_settings[0];
  }

  const created = await requestGraphql<{
    insert_ai_chat_settings_one: Record<string, any>;
  }>(
    `
      mutation CreateAiSettings($object: ai_chat_settings_insert_input!) {
        insert_ai_chat_settings_one(object: $object) {
          id
          user_id
          openai_api_key
          anthropic_api_key
          google_api_key
          openrouter_api_key
          deepseek_api_key
          ollama_base_url
          ollama_api_key
          active_provider
          active_model
          system_prompt
          temperature
          max_tokens
          use_rag
          created_at
          updated_at
        }
      }
    `,
    {
      object: {
        user_id: userId,
        ...DEFAULT_SETTINGS,
      },
    }
  );

  return created.insert_ai_chat_settings_one;
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const settings = await getOrCreateSettings(bootstrap.user.id);
      sendJson(res, 200, { settings: publicAiSettingsPayload(settings) });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      const existing = await getOrCreateSettings(bootstrap.user.id);
      const body = await readJsonBody<Record<string, any>>(req);
      const allowedFlat = [
        "openai_api_key",
        "anthropic_api_key",
        "google_api_key",
        "openrouter_api_key",
        "deepseek_api_key",
        "ollama_base_url",
        "ollama_api_key",
        "active_provider",
        "active_model",
        "system_prompt",
        "temperature",
        "max_tokens",
        "use_rag",
      ];
      const updates: Record<string, unknown> = Object.fromEntries(
        Object.entries(body).filter(([key]) => allowedFlat.includes(key))
      );

      if (body.settings_json !== undefined && typeof body.settings_json === "object" && body.settings_json !== null) {
        const merged = mergeSettingsJson(existing.settings_json, body.settings_json as Partial<AiSettingsJsonV1>);
        updates.settings_json = JSON.stringify(merged);
      } else if (typeof body.settings_json === "string") {
        const merged = mergeSettingsJson(existing.settings_json, parseSettingsJsonField(body.settings_json));
        updates.settings_json = JSON.stringify(merged);
      }

      const updated = await requestGraphql<{
        update_ai_chat_settings_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateAiSettings($id: uuid!, $changes: ai_chat_settings_set_input!) {
            update_ai_chat_settings_by_pk(pk_columns: { id: $id }, _set: $changes) {
              id
              user_id
              openai_api_key
              anthropic_api_key
              google_api_key
              openrouter_api_key
              deepseek_api_key
              ollama_base_url
              ollama_api_key
              active_provider
              active_model
              system_prompt
              temperature
              max_tokens
              use_rag
              settings_json
              created_at
              updated_at
            }
          }
        `,
        {
          id: existing.id,
          changes: updates,
        }
      );

      const rawSettings = updated.update_ai_chat_settings_by_pk || existing;
      const settings = publicAiSettingsPayload(rawSettings as Record<string, unknown>);
      const providerModels = getProviderModels(String(settings.active_provider ?? "openai"));
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

export function getProviderModels(provider: string): Array<{ id: string; name: string; context_window: number }> {
  const registry: Record<string, Array<{ id: string; name: string; context_window: number }>> = {
    openai: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini", context_window: 128000 },
      { id: "gpt-4o", name: "GPT-4o", context_window: 128000 },
    ],
    anthropic: [
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", context_window: 200000 },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", context_window: 200000 },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", context_window: 200000 },
    ],
    google: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context_window: 1048576 },
    ],
    openrouter: [
      { id: "openai/gpt-4o-mini", name: "OpenRouter GPT-4o Mini", context_window: 128000 },
    ],
    deepseek: [
      { id: "deepseek-chat", name: "DeepSeek Chat", context_window: 64000 },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner", context_window: 64000 },
      { id: "deepseek-coder", name: "DeepSeek Coder", context_window: 64000 },
    ],
    ollama: [{ id: "llama3.2", name: "llama3.2 (lokal, Beispiel)", context_window: 8192 }],
  };

  return registry[provider] || registry.openai;
}
