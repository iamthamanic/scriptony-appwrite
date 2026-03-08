/**
 * AI settings routes for the Nhost compatibility layer.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import { requestGraphql } from "../../../_shared/hasura";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";

const DEFAULT_SETTINGS = {
  openai_api_key: null,
  anthropic_api_key: null,
  google_api_key: null,
  openrouter_api_key: null,
  deepseek_api_key: null,
  active_provider: "openai",
  active_model: "gpt-4o-mini",
  system_prompt:
    "Du bist ein hilfreicher Assistent fuer Drehbuchautoren. Du hilfst bei Story, Charakteren und Worldbuilding.",
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
      sendJson(res, 200, { settings });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      const existing = await getOrCreateSettings(bootstrap.user.id);
      const body = await readJsonBody<Record<string, any>>(req);
      const allowed = [
        "openai_api_key",
        "anthropic_api_key",
        "google_api_key",
        "openrouter_api_key",
        "deepseek_api_key",
        "active_provider",
        "active_model",
        "system_prompt",
        "temperature",
        "max_tokens",
        "use_rag",
      ];
      const updates = Object.fromEntries(
        Object.entries(body).filter(([key]) => allowed.includes(key))
      );

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
          id: existing.id,
          changes: updates,
        }
      );

      const settings = updated.update_ai_chat_settings_by_pk || existing;
      const providerModels = getProviderModels(settings.active_provider);
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
      { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", context_window: 200000 },
      { id: "claude-3-5-haiku", name: "Claude 3.5 Haiku", context_window: 200000 },
    ],
    google: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context_window: 1048576 },
    ],
    openrouter: [
      { id: "openai/gpt-4o-mini", name: "OpenRouter GPT-4o Mini", context_window: 128000 },
    ],
    deepseek: [
      { id: "deepseek-chat", name: "DeepSeek Chat", context_window: 64000 },
    ],
  };

  return registry[provider] || registry.openai;
}
