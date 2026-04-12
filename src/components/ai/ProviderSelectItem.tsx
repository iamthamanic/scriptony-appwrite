import { Check } from "lucide-react";
import { SelectItem } from "../ui/select";
import { Badge } from "../ui/badge";
import {
  type FeatureKey,
  ACTIVE_CHECKBOX_STYLE,
  INACTIVE_CHECKBOX_STYLE,
  KEY_SAVED_BADGE_STYLE,
  ACTIVE_BADGE_STYLE,
} from "../../hooks/useProviderSelection";
import {
  normalizeProviderIdForUi,
  CANONICAL_OLLAMA_PROVIDER_ID,
} from "../../lib/ai-provider-allowlist";

interface ProviderSelectItemProps {
  provider: { id: string; name?: string };
  featureKey: FeatureKey;
  isActive: boolean;
  hasSavedKey: boolean;
  canActivate: boolean;
  onActivate: (providerId: string) => (e: React.MouseEvent) => void;
  getProviderDisplayName: (providerId: string) => string;
}

export function ProviderSelectItem({
  provider,
  featureKey,
  isActive,
  hasSavedKey,
  canActivate,
  onActivate,
  getProviderDisplayName,
}: ProviderSelectItemProps) {
  return (
    <SelectItem
      key={provider.id}
      value={provider.id}
      textValue={getProviderDisplayName(provider.id)}
    >
      <div className="ml-auto flex items-center gap-2">
        {hasSavedKey ? (
          <Badge variant="outline" style={KEY_SAVED_BADGE_STYLE}>
            Key Saved
          </Badge>
        ) : null}
        {isActive ? (
          <Badge variant="outline" style={ACTIVE_BADGE_STYLE}>
            Active
          </Badge>
        ) : null}
        {canActivate ? (
          <button
            type="button"
            onClick={onActivate(provider.id)}
            className="flex size-4 items-center justify-center rounded-[4px] border cursor-pointer"
            style={isActive ? ACTIVE_CHECKBOX_STYLE : INACTIVE_CHECKBOX_STYLE}
            title={isActive ? "Aktiver Provider" : "Als aktiven Provider setzen"}
          >
            {isActive ? <Check className="size-3" /> : null}
          </button>
        ) : null}
      </div>
    </SelectItem>
  );
}
