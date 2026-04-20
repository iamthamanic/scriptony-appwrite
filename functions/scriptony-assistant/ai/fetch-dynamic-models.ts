/**
 * Dynamic model discovery — thin wrapper around ai-service model-discovery.
 * Location: functions/scriptony-assistant/ai/fetch-dynamic-models.ts
 */

import {
  discoverModels,
  type ModelInfo,
} from "../../_shared/ai-service/model-discovery";
import { getModelsForProvider } from "../../_shared/ai-service/config/models";

type LegacyModelRow = { id: string; name: string; context_window: number };

function modelInfoToLegacy(models: ModelInfo[]): LegacyModelRow[] {
  return models.map((m) => ({
    id: m.id,
    name: m.name,
    context_window: m.contextWindow ?? 8192,
  }));
}

export async function listRemoteModels(
  provider: string,
  opts: {
    apiKey?: string;
    ollamaBaseUrl?: string;
    ollamaMode?: "local" | "cloud";
  },
): Promise<{ models: LegacyModelRow[]; source: "remote" | "registry" }> {
  const fallback = modelInfoToLegacy(getModelsForProvider(provider));
  try {
    const discovered = await discoverModels(provider, "assistant_chat", {
      apiKey: opts.apiKey,
      baseUrl: opts.ollamaBaseUrl,
    });
    if (discovered.length) {
      return { models: modelInfoToLegacy(discovered), source: "remote" };
    }
  } catch {
    // fall through to registry
  }
  return { models: fallback, source: "registry" };
}

export async function listRemoteModelsWithCapabilities(
  provider: string,
  opts: {
    apiKey?: string;
    ollamaBaseUrl?: string;
    ollamaMode?: "local" | "cloud";
  },
): Promise<{ models: ModelInfo[]; source: "remote" | "registry" }> {
  try {
    const discovered = await discoverModels(provider, "assistant_chat", {
      apiKey: opts.apiKey,
      baseUrl: opts.ollamaBaseUrl,
    });
    if (discovered.length) {
      return { models: discovered, source: "remote" };
    }
  } catch {
    // fall through
  }
  const fallback = getModelsForProvider(provider);
  return { models: fallback, source: "registry" };
}
