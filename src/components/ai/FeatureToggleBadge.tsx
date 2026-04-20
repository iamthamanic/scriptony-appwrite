/**
 * Single routable feature: colored Badge + Switch (an=grün, aus=rot).
 * Shared by ProviderFeatureToggleBadges and ImageFeatureToggleBadges — one visual atom.
 * Location: src/components/ai/FeatureToggleBadge.tsx
 */

import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { cn } from "../ui/utils";

export interface FeatureToggleBadgeProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (v: boolean) => void;
  /** Defaults to `label` if omitted */
  ariaLabel?: string;
  id?: string;
  /** e.g. short help on hover (LLM toggles omit this) */
  title?: string;
}

export function FeatureToggleBadge({
  label,
  checked,
  disabled,
  onCheckedChange,
  ariaLabel,
  id,
  title,
}: FeatureToggleBadgeProps) {
  const offState = !checked;
  return (
    <div className="box-border min-w-0 shrink-0" title={title}>
      <Badge
        variant="outline"
        asChild
        style={{
          backgroundColor: checked
            ? "rgba(16,185,129,0.16)"
            : "rgba(239,68,68,0.16)",
          borderColor: checked ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)",
          color: checked ? "rgb(236,253,245)" : "rgb(254,242,242)",
        }}
        className={cn(
          "h-auto min-h-8 shrink-0 gap-0 py-2 pl-3.5 pr-2.5 font-normal shadow-none",
          checked &&
            "border-emerald-500/55 bg-emerald-500/15 text-emerald-950 dark:text-emerald-50",
          offState &&
            "border-red-500/55 bg-red-500/15 text-red-950 dark:text-red-50",
        )}
      >
        <div className="flex items-center gap-4 sm:gap-5">
          <span className="max-w-[6.5rem] shrink-0 truncate text-xs font-medium leading-none">
            {label}
          </span>
          <Switch
            id={id}
            style={{
              backgroundColor: checked ? "#059669" : "rgba(239,68,68,0.8)",
            }}
            className={cn(
              "ml-0.5 shrink-0",
              "data-[state=checked]:!bg-emerald-600 data-[state=unchecked]:!bg-red-500/80 dark:data-[state=unchecked]:!bg-red-500/75",
            )}
            checked={checked}
            disabled={disabled}
            aria-label={ariaLabel ?? label}
            onCheckedChange={onCheckedChange}
          />
        </div>
      </Badge>
    </div>
  );
}
