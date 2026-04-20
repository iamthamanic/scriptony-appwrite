/**
 * Per image provider row: Cover / 2DStage toggles — same contract as ProviderFeatureToggleBadges.
 * Location: src/components/ai/ImageFeatureToggleBadges.tsx
 */

import { cn } from "../ui/utils";
import {
  IMAGE_FEATURE_TOGGLE_TITLES,
  IMAGE_ROUTABLE_FEATURES,
  type ImageFeatureId,
  type ImageProviderId,
} from "../../lib/ai-image-feature-routing";
import { FeatureToggleBadge } from "./FeatureToggleBadge";

export interface ImageFeatureToggleBadgesProps {
  providerId: ImageProviderId;
  featureFlags: Record<ImageFeatureId, boolean>;
  isOnForProvider: (fid: ImageFeatureId) => boolean;
  disabled: boolean;
  onToggle: (fid: ImageFeatureId, checked: boolean) => void;
  className?: string;
  ids?: Partial<Record<ImageFeatureId, string>>;
}

export function ImageFeatureToggleBadges({
  providerId,
  featureFlags,
  isOnForProvider,
  disabled,
  onToggle,
  className,
  ids,
}: ImageFeatureToggleBadgesProps) {
  return (
    <div
      role="presentation"
      data-provider={providerId}
      className={cn(
        "flex flex-wrap items-center justify-start border-l border-border/60 pl-4",
        className,
      )}
      style={{
        gap: "0.75rem 1.5rem",
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {IMAGE_ROUTABLE_FEATURES.map(({ id, label }) => {
        const globallyOn = featureFlags[id];
        const checked = globallyOn && isOnForProvider(id);
        return (
          <FeatureToggleBadge
            key={id}
            id={ids?.[id]}
            label={label}
            title={IMAGE_FEATURE_TOGGLE_TITLES[id]}
            checked={checked}
            disabled={disabled || !globallyOn}
            ariaLabel={`${label} (${providerId === "ollama" ? "Ollama" : "OpenRouter"})`}
            onCheckedChange={(v) => {
              onToggle(id, v);
            }}
          />
        );
      })}
    </div>
  );
}
