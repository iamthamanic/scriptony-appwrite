/**
 * Per-provider row: each routable AI feature (Assistant/Gym/…) as a Badge containing label + Switch.
 * Feature list comes from AI_ROUTABLE_FEATURES — adding features in ai-feature-routing.ts updates all providers.
 * Location: src/components/ai/ProviderFeatureToggleBadges.tsx
 */

import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { cn } from "../ui/utils";
import type { LlmProviderId } from "../../lib/llm-provider-registry";
import { AI_ROUTABLE_FEATURES, type AiFeatureId } from "../../lib/ai-feature-routing";

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
        "flex flex-wrap items-center justify-start gap-x-5 gap-y-3 border-l border-border/60 pl-4",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {AI_ROUTABLE_FEATURES.map(({ id, label }) => {
        const globallyOn = featureFlags[id];
        const checked = globallyOn && isOnForProvider(id);
        const offState = !checked;
        return (
          <div key={id} className="shrink-0">
            <Badge
              variant="outline"
              asChild
              style={{
                backgroundColor: checked ? "rgba(16,185,129,0.16)" : "rgba(239,68,68,0.16)",
                borderColor: checked ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)",
                color: checked ? "rgb(236,253,245)" : "rgb(254,242,242)",
              }}
              className={cn(
                "h-auto min-h-8 shrink-0 gap-0 py-1.5 pl-3 pr-1.5 font-normal shadow-none",
                checked && "border-emerald-500/55 bg-emerald-500/15 text-emerald-950 dark:text-emerald-50",
                offState && "border-red-500/55 bg-red-500/15 text-red-950 dark:text-red-50"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="max-w-[6.5rem] truncate text-xs font-medium">{label}</span>
                <Switch
                  style={{
                    backgroundColor: checked ? "#059669" : "rgba(239,68,68,0.8)",
                  }}
                  className={cn(
                    "shrink-0 origin-center scale-90",
                    "data-[state=checked]:!bg-emerald-600 data-[state=unchecked]:!bg-red-500/80 dark:data-[state=unchecked]:!bg-red-500/75"
                  )}
                  checked={checked}
                  disabled={disabled || !globallyOn}
                  aria-label={`${label} für diesen Anbieter`}
                  onCheckedChange={(v) => {
                    onToggle(id, v);
                  }}
                />
              </div>
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
