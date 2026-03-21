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

type ProviderSettings = {
  provider: "openai" | "anthropic" | "google" | "openrouter" | "deepseek";
  model: string;
  apiKey: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
};

function cleanMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((entry) => entry.content.trim().length > 0);
}

function estimateTokens(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

async function callOpenAiCompatible(
  settings: ProviderSettings,
  messages: ChatMessage[],
  endpoint: string,
  extraHeaders?: Record<string, string>
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
      ...extraHeaders,
    },
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
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

  const response = await fetch(
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

export async function generateAiResponse(input: {
  settings: ProviderSettings;
  conversationMessages: ChatMessage[];
  latestMessage: string;
}): Promise<{
  content: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const messages = cleanMessages([
    { role: "system", content: input.settings.systemPrompt },
    ...input.conversationMessages,
    { role: "user", content: input.latestMessage },
  ]);

  let content = "";
  if (input.settings.provider === "anthropic") {
    content = await callAnthropic(input.settings, messages);
  } else if (input.settings.provider === "google") {
    content = await callGoogle(input.settings, messages);
  } else if (input.settings.provider === "openrouter") {
    content = await callOpenAiCompatible(
      input.settings,
      messages,
      "https://openrouter.ai/api/v1/chat/completions",
      {
        "HTTP-Referer": "https://scriptony.app",
        "X-Title": "Scriptony",
      }
    );
  } else if (input.settings.provider === "deepseek") {
    content = await callOpenAiCompatible(
      input.settings,
      messages,
      "https://api.deepseek.com/chat/completions"
    );
  } else {
    content = await callOpenAiCompatible(
      input.settings,
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
