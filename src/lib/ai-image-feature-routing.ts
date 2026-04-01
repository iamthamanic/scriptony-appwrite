/**
 * Routable image surface areas (Cover, 2DStage) — registry, flags, and routing (mirrors backend ai-feature-profile).
 * Location: src/lib/ai-image-feature-routing.ts
 */

export type ImageFeatureId = "cover" | "stage2d";

export type ImageProviderId = "ollama" | "openrouter";

export interface ImageFeatureProfileOverride {
  provider?: ImageProviderId;
  model?: string;
}

/** Subset of settings_json.image used for routing UI */
export interface AiImageRoutingParsed {
  image?: {
    provider?: ImageProviderId;
    model?: string;
    enabled_features?: ImageFeatureId[];
    feature_profiles?: Partial<Record<ImageFeatureId, ImageFeatureProfileOverride | null>>;
    provider_models?: Partial<Record<ImageProviderId, string>>;
    ollama?: { mode?: "cloud" } | null;
  } | null;
}

export const IMAGE_ROUTABLE_FEATURES: ReadonlyArray<{ id: ImageFeatureId; label: string }> = [
  { id: "cover", label: "Cover" },
  { id: "stage2d", label: "2DStage" },
] as const;

export const IMAGE_FEATURE_TOGGLE_TITLES: Record<ImageFeatureId, string> = {
  cover: "Aktiviert Generate-Flow für Projektcover.",
  stage2d: "Reserviert für Stage-Assets (v1: nur Toggle).",
};

export function getImageFeatureFlags(
  parsed: AiImageRoutingParsed | undefined
): Record<ImageFeatureId, boolean> {
  const ef = parsed?.image?.enabled_features;
  if (ef === undefined) {
    return { cover: true, stage2d: true };
  }
  return {
    cover: ef.includes("cover"),
    stage2d: ef.includes("stage2d"),
  };
}

export function getRoutedImageProviderForFeature(
  parsed: AiImageRoutingParsed | undefined,
  fid: ImageFeatureId
): ImageProviderId | undefined {
  const p = parsed?.image?.feature_profiles?.[fid]?.provider;
  if (p === "openrouter" || p === "ollama") return p;
  return undefined;
}

export function getEffectiveImageProviderForFeature(
  parsed: AiImageRoutingParsed | undefined,
  fid: ImageFeatureId
): ImageProviderId | undefined {
  const explicit = getRoutedImageProviderForFeature(parsed, fid);
  if (explicit) return explicit;
  const flags = getImageFeatureFlags(parsed);
  if (!flags[fid]) return undefined;
  return parsed?.image?.provider === "openrouter" ? "openrouter" : "ollama";
}

export function getEffectiveImageModelForFeature(
  parsed: AiImageRoutingParsed | undefined,
  fid: ImageFeatureId
): string {
  const img = parsed?.image;
  if (!img) return "";
  const routedPid = getEffectiveImageProviderForFeature(parsed, fid);
  const fpModel = img.feature_profiles?.[fid]?.model?.trim();
  if (fpModel) return fpModel;
  if (routedPid && typeof img.provider_models?.[routedPid] === "string") {
    const m = img.provider_models[routedPid]!.trim();
    if (m) return m;
  }
  const legacy = typeof img.model === "string" ? img.model.trim() : "";
  return legacy || "";
}
