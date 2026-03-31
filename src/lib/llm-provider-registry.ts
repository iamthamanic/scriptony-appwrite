/**
 * UI registry for LLM providers and model ids (keep in sync with getProviderModels in functions/scriptony-assistant/ai/settings.ts).
 * Location: src/lib/llm-provider-registry.ts
 */

export const LLM_PROVIDER_IDS = ["openai", "anthropic", "google", "openrouter", "deepseek", "ollama"] as const;
export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number];

export const MODELS_BY_PROVIDER: Record<LlmProviderId, { id: string; name: string }[]> = {
  openai: [
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4o", name: "GPT-4o" },
  ],
  anthropic: [
    { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
  ],
  google: [{ id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" }],
  openrouter: [
    { id: "openai/gpt-4o-mini", name: "OpenRouter: GPT-4o Mini" },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "OpenRouter: Llama 3.3 70B" },
    { id: "ollama/llama3.2", name: "OpenRouter → Ollama-Pfad (Beispiel)" },
  ],
  deepseek: [
    { id: "deepseek-chat", name: "DeepSeek Chat" },
    { id: "deepseek-reasoner", name: "DeepSeek Reasoner" },
    { id: "deepseek-coder", name: "DeepSeek Coder" },
  ],
  ollama: [{ id: "llama3.2", name: "llama3.2 (Beispiel)" }],
};

/** Stage: meist keine Chat-LLMs — Platzhalter bis eigene Generatoren angebunden sind. */
export const STAGE_MODEL_SUGGESTIONS: { id: string; name: string }[] = [
  { id: "stage-2d-placeholder", name: "2D-Generierung (Platzhalter)" },
  { id: "stage-3d-placeholder", name: "3D-Generierung (Platzhalter)" },
];

export function defaultModelForProvider(pid: LlmProviderId): string {
  return MODELS_BY_PROVIDER[pid][0]?.id ?? "gpt-4o-mini";
}

/** Label for Select when id matches UI registry; otherwise return raw id. */
export function resolveModelDisplayName(provider: string, modelId: string): string {
  if (!modelId) return "";
  const list = MODELS_BY_PROVIDER[provider as LlmProviderId];
  const hit = list?.find((m) => m.id === modelId);
  if (hit) return hit.name;
  return modelId;
}
