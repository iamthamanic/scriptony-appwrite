import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import {
  KEY_SAVED_BADGE_STYLE,
  ACTIVE_BADGE_STYLE,
} from "../../hooks/useProviderSelection";

interface ProviderBadgesProps {
  providerLabel: string;
  hasSavedKey: boolean;
  isActive: boolean;
  canSave: boolean;
  isSaving: boolean;
  isDirty: boolean;
  onSave: () => void;
}

export function ProviderBadges({
  providerLabel,
  hasSavedKey,
  isActive,
  canSave,
  isSaving,
  isDirty,
  onSave,
}: ProviderBadgesProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{providerLabel}</Badge>
      {hasSavedKey && (
        <Badge variant="outline" style={KEY_SAVED_BADGE_STYLE}>
          Key Saved
        </Badge>
      )}
      {isActive && (
        <Badge variant="outline" style={ACTIVE_BADGE_STYLE}>
          Active
        </Badge>
      )}
      {canSave && (
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Provider speichern"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
