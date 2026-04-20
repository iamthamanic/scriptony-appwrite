import {
  type CanonicalAiFeature,
  type ResolvedFeatureRuntime,
  resolveFeatureRuntime,
} from "./ai-central-store";
import { OLLAMA_CLOUD_ORIGIN } from "./ai-feature-profile";
import { getModelInfo, getModelsForProvider } from "./ai-service/config";
import {
  isOllamaFamilyProvider,
  PROVIDER_DISPLAY_NAMES,
} from "./ai-service/providers";
import { fetchUnifiedModels, toLegacyModelRows } from "./model-capabilities";

export type RuntimeModelInfo = {
  id: string;
  name: string;
  context_window: number;
};

export type ResolvedFeatureRuntimeStatus = {
  providerDisplay: string;
  ollamaMode?: "local" | "cloud";
  requiresApiKey: boolean;
  hasCredentials: boolean;
  configured: boolean;
  error?: string;
};

export type FeatureRuntimeView = {
  feature: CanonicalAiFeature;
  provider: string;
  provider_display: string;
  model: string;
  selected_model: RuntimeModelInfo | null;
  models_with_context: RuntimeModelInfo[];
  source: "remote" | "registry";
  configured: boolean;
  can_send: boolean;
  requires_api_key: boolean;
  has_credentials: boolean;
  ollama_mode?: "local" | "cloud";
  base_url?: string;
  error?: string;
};

function trimSlash(value: string | undefined): string {
  return (value || "").trim().replace(/\/$/, "");
}

function inferOllamaMode(
  runtime: ResolvedFeatureRuntime,
): "local" | "cloud" | undefined {
  if (runtime.config.provider === "ollama_local") return "local";
  if (runtime.config.provider === "ollama_cloud") return "cloud";
  if (runtime.config.provider !== "ollama") return undefined;
  const base = trimSlash(runtime.baseUrl);
  if (base === trimSlash(OLLAMA_CLOUD_ORIGIN)) return "cloud";
  if (base) return "local";
  if (runtime.apiKey) return "cloud";
  return "local";
}

function providerDisplayName(
  runtime: ResolvedFeatureRuntime,
  ollamaMode?: "local" | "cloud",
): string {
  if (runtime.config.provider === "ollama" && ollamaMode === "cloud") {
    return "Ollama (Cloud)";
  }
  if (runtime.config.provider === "ollama" && ollamaMode === "local") {
    return "Ollama (lokal)";
  }
  return (
    PROVIDER_DISPLAY_NAMES[runtime.config.provider] || runtime.config.provider
  );
}

function credentialError(
  runtime: ResolvedFeatureRuntime,
  ollamaMode?: "local" | "cloud",
): string | undefined {
  if (!runtime.config.provider.trim()) {
    return "Kein Provider für dieses Feature gespeichert.";
  }
  if (!runtime.config.model.trim()) {
    return "Kein Modell für dieses Feature gespeichert.";
  }
  if (
    runtime.config.provider === "ollama_local" ||
    (runtime.config.provider === "ollama" && ollamaMode === "local")
  ) {
    return "Ollama (lokal): Bitte Basis-URL in den KI-Integrationen setzen.";
  }
  if (
    runtime.config.provider === "ollama_cloud" ||
    (runtime.config.provider === "ollama" && ollamaMode === "cloud")
  ) {
    return "Ollama Cloud: Bitte API-Key in den KI-Integrationen hinterlegen.";
  }
  return `Bitte API-Key für ${
    providerDisplayName(
      runtime,
      ollamaMode,
    )
  } in den KI-Integrationen hinterlegen.`;
}

export function describeResolvedFeatureRuntime(
  runtime: ResolvedFeatureRuntime,
): ResolvedFeatureRuntimeStatus {
  const provider = runtime.config.provider;
  const model = runtime.config.model.trim();
  const ollamaMode = inferOllamaMode(runtime);
  const isOllama = isOllamaFamilyProvider(provider) || provider === "ollama";
  const requiresApiKey = isOllama ? ollamaMode !== "local" : true;
  const hasCredentials = isOllama
    ? ollamaMode === "local"
      ? Boolean(trimSlash(runtime.baseUrl))
      : Boolean(runtime.apiKey)
    : Boolean(runtime.apiKey);
  const configured = Boolean(provider.trim() && model && hasCredentials);

  return {
    providerDisplay: providerDisplayName(runtime, ollamaMode),
    ...(ollamaMode ? { ollamaMode } : {}),
    requiresApiKey,
    hasCredentials,
    configured,
    ...(configured ? {} : { error: credentialError(runtime, ollamaMode) }),
  };
}

function toRuntimeModels(
  rows: ReturnType<typeof getModelsForProvider>,
): RuntimeModelInfo[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    context_window:
      typeof row.contextWindow === "number" && row.contextWindow > 0
        ? row.contextWindow
        : 8192,
  }));
}

function findModelByIdLoose(
  list: RuntimeModelInfo[],
  id: string,
): RuntimeModelInfo | undefined {
  const target = id.trim();
  if (!target) return undefined;
  const exact = list.find((row) => row.id === target);
  if (exact) return exact;
  const lower = target.toLowerCase();
  return list.find((row) => row.id.toLowerCase() === lower);
}

function defaultContextWindow(
  provider: string,
  list: RuntimeModelInfo[],
  modelId: string,
): number {
  const registryInfo = getModelInfo(modelId);
  if (
    typeof registryInfo?.contextWindow === "number" &&
    registryInfo.contextWindow > 0
  ) {
    return registryInfo.contextWindow;
  }
  if (list.length > 0 && list[0].context_window > 0) {
    return list[0].context_window;
  }
  if (provider === "deepseek") return 64000;
  return 128000;
}

function modelDisplayName(provider: string, modelId: string): string {
  const registryInfo =
    getModelsForProvider(provider).find((row) => row.id === modelId) ||
    getModelInfo(modelId);
  return registryInfo?.name || modelId;
}

function mergeSelectedModelIfMissing(
  provider: string,
  selectedModelId: string,
  models: RuntimeModelInfo[],
): RuntimeModelInfo[] {
  const modelId = selectedModelId.trim();
  if (!modelId || findModelByIdLoose(models, modelId)) return models;
  return [
    {
      id: modelId,
      name: modelDisplayName(provider, modelId),
      context_window: defaultContextWindow(provider, models, modelId),
    },
    ...models,
  ];
}

async function fetchModelsForRuntime(
  runtime: ResolvedFeatureRuntime,
  status: ResolvedFeatureRuntimeStatus,
): Promise<{ models: RuntimeModelInfo[]; source: "remote" | "registry" }> {
  const registryModels = toRuntimeModels(
    getModelsForProvider(runtime.config.provider),
  );
  if (!status.hasCredentials) {
    return { models: registryModels, source: "registry" };
  }

  const providerForFetch = runtime.config.provider === "ollama_local" ||
      runtime.config.provider === "ollama_cloud"
    ? "ollama"
    : runtime.config.provider;

  const remote = await fetchUnifiedModels({
    provider: providerForFetch,
    apiKey: runtime.apiKey || undefined,
    ...(status.ollamaMode ? { ollamaMode: status.ollamaMode } : {}),
    ...(status.ollamaMode === "local"
      ? { ollamaBaseUrl: runtime.baseUrl }
      : {}),
  });

  if (remote.models.length === 0) {
    return { models: registryModels, source: "registry" };
  }

  return {
    models: toLegacyModelRows(remote.models),
    source: remote.source,
  };
}

export async function getFeatureRuntimeView(
  userId: string,
  feature: CanonicalAiFeature,
  options?: { includeModels?: boolean },
): Promise<FeatureRuntimeView> {
  const runtime = await resolveFeatureRuntime(userId, feature);
  const status = describeResolvedFeatureRuntime(runtime);
  const includeModels = options?.includeModels !== false;

  let models: RuntimeModelInfo[] = [];
  let source: "remote" | "registry" = "registry";

  if (includeModels) {
    const loaded = await fetchModelsForRuntime(runtime, status);
    models = loaded.models;
    source = loaded.source;
  }

  models = mergeSelectedModelIfMissing(
    runtime.config.provider,
    runtime.config.model,
    models,
  );
  const selectedModel = runtime.config.model.trim()
    ? findModelByIdLoose(models, runtime.config.model) || {
      id: runtime.config.model.trim(),
      name: modelDisplayName(
        runtime.config.provider,
        runtime.config.model.trim(),
      ),
      context_window: defaultContextWindow(
        runtime.config.provider,
        models,
        runtime.config.model.trim(),
      ),
    }
    : null;

  return {
    feature,
    provider: runtime.config.provider,
    provider_display: status.providerDisplay,
    model: runtime.config.model,
    selected_model: selectedModel,
    models_with_context: models,
    source,
    configured: status.configured,
    can_send: status.configured,
    requires_api_key: status.requiresApiKey,
    has_credentials: status.hasCredentials,
    ...(status.ollamaMode ? { ollama_mode: status.ollamaMode } : {}),
    ...(runtime.baseUrl ? { base_url: runtime.baseUrl } : {}),
    ...(status.error ? { error: status.error } : {}),
  };
}
