/**
 * Loads assistant LLM routing hints from ai_chat_settings (same source as scriptony-assistant).
 * Returns metadata only — never API keys.
 */

import { requestGraphql } from "../_shared/graphql-compat";
import { resolveAiFeatureProfile } from "../_shared/ai-feature-profile";
import type { AssistantProfileSummary } from "../../src/scriptony-runtime/provider-router";

export async function loadAssistantProfileSummary(userId: string): Promise<AssistantProfileSummary | null> {
  const existing = await requestGraphql<{
    ai_chat_settings: Array<Record<string, unknown>>;
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

  const row = existing.ai_chat_settings[0];
  if (!row) {
    return {
      providerId: null,
      modelId: null,
      resolutionNote: "No ai_chat_settings row for user.",
    };
  }

  const resolved = resolveAiFeatureProfile(row, "assistant");
  if (resolved.ok) {
    return {
      providerId: resolved.settings.provider,
      modelId: resolved.settings.model,
    };
  }

  return {
    providerId: typeof row.active_provider === "string" ? row.active_provider : null,
    modelId: typeof row.active_model === "string" ? row.active_model : null,
    resolutionNote: resolved.error,
  };
}
