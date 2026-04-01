/**
 * Per-provider row: each routable AI feature (Assistant/Gym/…) as a Badge containing label + Switch.
 * Feature list comes from AI_ROUTABLE_FEATURES — adding features in ai-feature-routing.ts updates all providers.
 * Location: src/components/ai/ProviderFeatureToggleBadges.tsx
 */

import { cn } from "../ui/utils";
import type { LlmProviderId } from "../../lib/llm-provider-registry";
import { AI_ROUTABLE_FEATURES, type AiFeatureId } from "../../lib/ai-feature-routing";
import { FeatureToggleBadge } from "./FeatureToggleBadge";

export interface ProviderFeatureToggleBadgesProps {
  /** Optional (e.g. tests, analytics); layout does not depend on it. */
  providerId?: LlmProviderId;
  featureFlags: Record<AiFeatureId, boolean>;
  /** True when this provider is assigned to `fid` and the global feature is on. */
  isOnForProvider: (fid: AiFeatureId) => boolean;
  disabled: boolean;
  onToggle: (fid: AiFeatureId, checked: boolean) => void;
  className?: string;
}

export function ProviderFeatureToggleBadges({
  providerId,
  featureFlags,
  isOnForProvider,
  disabled,
  onToggle,
  className,
}: ProviderFeatureToggleBadgesProps) {
  return (
    <div
      role="presentation"
      data-provider={providerId}
      className={cn(
        "flex flex-wrap items-center justify-start border-l border-border/60 pl-4",
        className
      )}
      style={{
        // Explizit per style: Flex-Gap bleibt zuverlässig (Tailwind-Merge kann gap-* in manchen Setups verlieren).
        gap: "0.75rem 1.5rem",
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {AI_ROUTABLE_FEATURES.map(({ id, label }) => {
        const globallyOn = featureFlags[id];
        const checked = globallyOn && isOnForProvider(id);
        return (
          <FeatureToggleBadge
            key={id}
            label={label}
            checked={checked}
            disabled={disabled || !globallyOn}
            ariaLabel={`${label} für diesen Anbieter`}
            onCheckedChange={(v) => {
              onToggle(id, v);
            }}
          />
        );
      })}
    </div>
  );
}
