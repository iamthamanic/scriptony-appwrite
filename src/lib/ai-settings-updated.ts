/**
 * Decoupled signal when /ai/settings persistence changed model or provider — e.g. Settings page
 * has no reference to ScriptonyAssistant, but the assistant should drop its 60s settings cache.
 * Location: src/lib/ai-settings-updated.ts
 */

export const SCRIPTONY_AI_SETTINGS_UPDATED_EVENT =
  "scriptony-ai-settings-updated";

export function notifyAiSettingsConsumers(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SCRIPTONY_AI_SETTINGS_UPDATED_EVENT));
}
