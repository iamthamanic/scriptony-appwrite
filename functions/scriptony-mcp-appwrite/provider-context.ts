/**
 * Loads assistant LLM routing hints from ai_chat_settings (same source as scriptony-assistant).
 * Returns metadata only — never API keys.
 */

import { getLegacyAssistantSettings } from "../_shared/ai-central-store";
import { resolveAiFeatureProfile } from "../_shared/ai-feature-profile";
import type { AssistantProfileSummary } from "../../src/scriptony-runtime/provider-router";

export async function loadAssistantProfileSummary(userId: string): Promise<AssistantProfileSummary | null> {
  const row = await getLegacyAssistantSettings(userId);
  if (!row) {
    return {
      providerId: null,
      modelId: null,
      resolutionNote: "No central AI settings row for user.",
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
