/**
 * Shared AI provider helpers for the Scriptony HTTP API.
 *
 * The goal is to keep provider-specific request/response mapping in one place
 * while the route handler focuses on persistence and auth.
 */

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderSettings = {
  provider: "openai" | "anthropic" | "google" | "openrouter" | "deepseek" | "ollama";
  model: string;
  apiKey: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  /** Nur Ollama: Basis-URL ohne trailing slash; Cloud = fest https://ollama.com */
  ollamaBaseUrl?: string;
  ollamaMode?: "local" | "cloud";
};

function cleanMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((entry) => entry.content.trim().length > 0);
}

function estimateTokens(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

const PROVIDER_TIMEOUT_MS = 25_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      throw new Error(`Provider timeout after ${Math.round(PROVIDER_TIMEOUT_MS / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAiCompatible(
  settings: ProviderSettings,
  messages: ChatMessage[],
  endpoint: string,
  extraHeaders?: Record<string, string>
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (settings.apiKey && settings.apiKey !== "__ollama_local__") {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      payload?.error?.message ||
      payload?.message ||
      `Provider request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  const text =
    payload?.choices?.[0]?.message?.content ||
    payload?.choices?.[0]?.text ||
    "";

  if (!text) {
    throw new Error("Provider returned an empty response");
  }

  return text;
}

async function callAnthropic(settings: ProviderSettings, messages: ChatMessage[]) {
  const system = settings.systemPrompt;
  const anthropicMessages = messages
    .filter((entry) => entry.role !== "system")
    .map((entry) => ({
      role: entry.role === "assistant" ? "assistant" : "user",
      content: entry.content,
    }));

  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: settings.model,
      system,
      messages: anthropicMessages,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      payload?.error?.message ||
      payload?.message ||
      `Provider request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  const text = Array.isArray(payload?.content)
    ? payload.content
        .map((entry: any) => entry?.text || "")
        .join("\n")
        .trim()
    : "";

  if (!text) {
    throw new Error("Provider returned an empty response");
  }

  return text;
}

async function callGoogle(settings: ProviderSettings, messages: ChatMessage[]) {
  const contents = messages
    .filter((entry) => entry.role !== "system")
    .map((entry) => ({
      role: entry.role === "assistant" ? "model" : "user",
      parts: [{ text: entry.content }],
    }));

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      settings.model
    )}:generateContent?key=${encodeURIComponent(settings.apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: settings.systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature: settings.temperature,
          maxOutputTokens: settings.maxTokens,
        },
      }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      payload?.error?.message ||
      payload?.message ||
      `Provider request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  const text = Array.isArray(payload?.candidates?.[0]?.content?.parts)
    ? payload.candidates[0].content.parts
        .map((entry: any) => entry?.text || "")
        .join("\n")
        .trim()
    : "";

  if (!text) {
    throw new Error("Provider returned an empty response");
  }

  return text;
}

const RAG_CONTEXT_SEPARATOR =
  "\n\n--- Scriptony Kontext (Auszug, nur zur Orientierung) ---\n";

export async function generateAiResponse(input: {
  settings: ProviderSettings;
  conversationMessages: ChatMessage[];
  latestMessage: string;
  /** Optional retrieved text from projects/worlds/characters; merged into system prompt. */
  retrievalContext?: string;
}): Promise<{
  content: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const rag = typeof input.retrievalContext === "string" ? input.retrievalContext.trim() : "";
  const effectiveSystemPrompt =
    rag.length > 0
      ? `${input.settings.systemPrompt}${RAG_CONTEXT_SEPARATOR}${rag}`
      : input.settings.systemPrompt;

  const settingsForCall: ProviderSettings = {
    ...input.settings,
    systemPrompt: effectiveSystemPrompt,
  };

  const messages = cleanMessages([
    { role: "system", content: settingsForCall.systemPrompt },
    ...input.conversationMessages,
    { role: "user", content: input.latestMessage },
  ]);

  let content = "";
  if (input.settings.provider === "anthropic") {
    content = await callAnthropic(settingsForCall, messages);
  } else if (input.settings.provider === "google") {
    content = await callGoogle(settingsForCall, messages);
  } else if (input.settings.provider === "openrouter") {
    content = await callOpenAiCompatible(
      settingsForCall,
      messages,
      "https://openrouter.ai/api/v1/chat/completions",
      {
        "HTTP-Referer": "https://scriptony.app",
        "X-Title": "Scriptony",
      }
    );
  } else if (input.settings.provider === "deepseek") {
    content = await callOpenAiCompatible(
      settingsForCall,
      messages,
      "https://api.deepseek.com/chat/completions"
    );
  } else if (input.settings.provider === "ollama") {
    const base = (input.settings.ollamaBaseUrl || "").trim().replace(/\/$/, "");
    if (!base) {
      throw new Error("Ollama: ollama_base_url fehlt in den KI-Einstellungen.");
    }
    content = await callOpenAiCompatible(
      settingsForCall,
      messages,
      `${base}/v1/chat/completions`
    );
  } else {
    content = await callOpenAiCompatible(
      settingsForCall,
      messages,
      "https://api.openai.com/v1/chat/completions"
    );
  }

  return {
    content,
    inputTokens: estimateTokens(messages.map((entry) => entry.content).join("\n")),
    outputTokens: estimateTokens(content),
  };
}
