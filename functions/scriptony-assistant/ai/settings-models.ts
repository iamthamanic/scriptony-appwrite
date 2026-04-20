/**
 * Static fallback model registry for assistant settings responses.
 */

export function getProviderModels(
  provider: string,
): Array<{ id: string; name: string; context_window: number }> {
  const registry: Record<
    string,
    Array<{ id: string; name: string; context_window: number }>
  > = {
    openai: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini", context_window: 128000 },
      { id: "gpt-4o", name: "GPT-4o", context_window: 128000 },
    ],
    anthropic: [
      {
        id: "claude-opus-4-20250514",
        name: "Claude Opus 4",
        context_window: 200000,
      },
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        context_window: 200000,
      },
      {
        id: "claude-3-5-haiku-20241022",
        name: "Claude 3.5 Haiku",
        context_window: 200000,
      },
    ],
    google: [
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        context_window: 1048576,
      },
    ],
    openrouter: [
      {
        id: "openai/gpt-4o-mini",
        name: "OpenRouter GPT-4o Mini",
        context_window: 128000,
      },
    ],
    deepseek: [
      { id: "deepseek-chat", name: "DeepSeek Chat", context_window: 64000 },
      {
        id: "deepseek-reasoner",
        name: "DeepSeek Reasoner",
        context_window: 64000,
      },
      { id: "deepseek-coder", name: "DeepSeek Coder", context_window: 64000 },
    ],
    ollama: [
      {
        id: "llama3.2",
        name: "llama3.2 (lokal, Beispiel)",
        context_window: 8192,
      },
    ],
  };

  return registry[provider] || registry.openai;
}
