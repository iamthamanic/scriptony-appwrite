/**
 * Optional display hints for model browse (Scriptony settings): typical use cases and rough public $/1M token prices.
 * Not authoritative — vendors change pricing; API-reported context wins for limits.
 * Location: src/lib/llm-model-hints.ts
 */

export type LlmModelHint = {
  bestFor: string[];
  /** USD per 1M input tokens (approx.) */
  inputPerMUsd?: number;
  /** USD per 1M output tokens (approx.) */
  outputPerMUsd?: number;
  note?: string;
};

const HINTS: Record<string, LlmModelHint> = {
  "gpt-4o": {
    bestFor: ["Chat", "Code", "Multimodal"],
    inputPerMUsd: 2.5,
    outputPerMUsd: 10,
  },
  "gpt-4o-mini": {
    bestFor: ["Chat", "schnell", "günstig"],
    inputPerMUsd: 0.15,
    outputPerMUsd: 0.6,
  },
  "gpt-4-turbo": {
    bestFor: ["Code", "langer Kontext"],
    inputPerMUsd: 10,
    outputPerMUsd: 30,
  },
  "o1-preview": { bestFor: ["Reasoning", "Mathe"], note: "ohne klassisches Tooling" },
  "o1-mini": { bestFor: ["Reasoning", "günstiger"], note: "ohne klassisches Tooling" },
  "o3-mini": { bestFor: ["Reasoning", "Code"] },
  "claude-opus-4": { bestFor: ["komplex", "Qualität"], inputPerMUsd: 15, outputPerMUsd: 75 },
  "claude-3-5-sonnet": {
    bestFor: ["Chat", "Code", "Balance"],
    inputPerMUsd: 3,
    outputPerMUsd: 15,
  },
  "claude-3-5-haiku": { bestFor: ["schnell", "günstig"], inputPerMUsd: 0.8, outputPerMUsd: 4 },
  "gemini-2.0-flash": {
    bestFor: ["Chat", "schnell"],
    inputPerMUsd: 0.1,
    outputPerMUsd: 0.4,
  },
  "gemini-2.5": { bestFor: ["Multimodal", "lang"], note: "Preise je nach Tier variieren" },
  "deepseek-chat": { bestFor: ["Chat", "günstig"], inputPerMUsd: 0.14, outputPerMUsd: 0.28 },
  "deepseek-reasoner": { bestFor: ["Reasoning"], note: "höhere Latenz" },
  "deepseek-coder": { bestFor: ["Code"] },
  "llama3.2": { bestFor: ["lokal", "Experiment"], note: "Ollama / lokal" },
  "llama3.3": { bestFor: ["Chat", "Open-Weights"] },
};

export function getLlmModelHint(modelId: string): LlmModelHint | null {
  if (!modelId) return null;
  if (HINTS[modelId]) return HINTS[modelId];
  const tail = modelId.includes("/") ? (modelId.split("/").pop() ?? modelId) : modelId;
  if (HINTS[tail]) return HINTS[tail];
  for (const key of Object.keys(HINTS)) {
    if (modelId.includes(key)) return HINTS[key]!;
  }
  return null;
}
