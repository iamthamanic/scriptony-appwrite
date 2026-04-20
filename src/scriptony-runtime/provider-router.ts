/**
 * Provider routing: metadata-only assistant profile for orchestration (no LLM calls here).
 * Full chat stays in scriptony-assistant / _shared/ai.
 */

export interface AssistantProfileSummary {
  providerId: string | null;
  modelId: string | null;
  /** When resolveAiFeatureProfile failed — short reason, never secrets. */
  resolutionNote?: string;
}

export interface ProviderRouter {
  describe(): { mode: "stub" | "from_settings"; note: string };
  getAssistantProfile(): AssistantProfileSummary | null;
}

export function createStubProviderRouter(): ProviderRouter {
  return {
    describe() {
      return {
        mode: "stub",
        note: "No ai_chat_settings loaded — use scriptony-mcp-appwrite with bootstrap + provider-context.",
      };
    },
    getAssistantProfile() {
      return null;
    },
  };
}

export function createProviderRouterFromSummary(
  summary: AssistantProfileSummary | null,
): ProviderRouter {
  return {
    describe() {
      if (!summary || (!summary.providerId && !summary.modelId)) {
        return {
          mode: "from_settings",
          note: "Assistant profile unavailable or empty (see resolutionNote on profile if set).",
        };
      }
      return {
        mode: "from_settings",
        note: "Assistant provider/model from ai_chat_settings (metadata only; no keys).",
      };
    },
    getAssistantProfile() {
      return summary;
    },
  };
}
