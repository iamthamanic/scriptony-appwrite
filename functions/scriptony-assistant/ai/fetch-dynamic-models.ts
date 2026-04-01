/**
 * Fetches unified model list with capabilities; provides legacy rows for existing callers.
 * Location: functions/scriptony-assistant/ai/fetch-dynamic-models.ts
 */

import { fetchUnifiedModels, toLegacyModelRows, type UnifiedModelRow } from "../../_shared/model-capabilities";
import { getProviderModels } from "./settings";

export async function listRemoteModels(
  provider: string,
  opts: { apiKey?: string; ollamaBaseUrl?: string; ollamaMode?: "local" | "cloud" }
): Promise<{ models: Array<{ id: string; name: string; context_window: number }>; source: "remote" | "registry" }> {
  const fallback = getProviderModels(provider);
  const unified = await fetchUnifiedModels({
    provider,
    apiKey: opts.apiKey,
    ollamaBaseUrl: opts.ollamaBaseUrl,
    ollamaMode: opts.ollamaMode,
  });
  const models = unified.models.length ? toLegacyModelRows(unified.models) : fallback;
  return { models, source: unified.models.length ? "remote" : "registry" };
}

export async function listRemoteModelsWithCapabilities(
  provider: string,
  opts: { apiKey?: string; ollamaBaseUrl?: string; ollamaMode?: "local" | "cloud" }
): Promise<{ models: UnifiedModelRow[]; source: "remote" | "registry" }> {
  return fetchUnifiedModels({
    provider,
    apiKey: opts.apiKey,
    ollamaBaseUrl: opts.ollamaBaseUrl,
    ollamaMode: opts.ollamaMode,
  });
}
