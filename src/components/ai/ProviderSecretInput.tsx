/**
 * API key / secret input with masked display when a value is stored, and an eye toggle to show the full secret.
 * Used by AISettingsForm for every provider key field (incl. Ollama Cloud).
 * Location: src/components/ai/ProviderSecretInput.tsx
 */

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

function maskKeyTail(stored: string): string {
  const t = stored.trim();
  if (!t) return "";
  if (t.length <= 4) return "•".repeat(10);
  return "•".repeat(8) + t.slice(-4);
}

export interface ProviderSecretInputProps {
  id: string;
  /** Current draft from parent (new key being typed). */
  draft: string;
  onDraftChange: (value: string) => void;
  /** Saved secret from server; when set and draft empty, field shows mask or full value per eye toggle. */
  storedSecret: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Optional: always render eye button (used for consistent UI parity). */
  alwaysShowToggle?: boolean;
}

export function ProviderSecretInput({
  id,
  draft,
  onDraftChange,
  storedSecret,
  disabled = false,
  placeholder = "",
  className,
  alwaysShowToggle = false,
}: ProviderSecretInputProps) {
  const hasStored = Boolean(storedSecret?.trim());
  const [revealStored, setRevealStored] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!hasStored) {
      setRevealStored(false);
      setEditing(false);
    }
  }, [hasStored, storedSecret]);

  const d = draft;

  let value: string;
  let readOnly: boolean;
  let inputType: "text" | "password";

  if (d.length > 0) {
    value = d;
    readOnly = false;
    inputType = revealStored ? "text" : "password";
  } else if (hasStored && !editing) {
    readOnly = true;
    if (revealStored) {
      value = storedSecret;
      inputType = "text";
    } else {
      value = maskKeyTail(storedSecret);
      inputType = "text";
    }
  } else {
    value = "";
    readOnly = false;
    inputType = "password";
  }

  const showEye = alwaysShowToggle || (hasStored && !d) || d.length > 0;

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <Input
        id={id}
        type={inputType}
        autoComplete="off"
        placeholder={placeholder}
        className="w-full pr-11 font-mono text-sm tracking-tight"
        value={value}
        readOnly={readOnly}
        disabled={disabled}
        onChange={(e) => onDraftChange(e.target.value)}
        onFocus={() => {
          if (hasStored && !d && readOnly) {
            setEditing(true);
            setRevealStored(false);
          }
        }}
        onBlur={() => {
          if (!draft) {
            setEditing(false);
            setRevealStored(false);
          }
        }}
      />
      {showEye ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="pointer-events-auto h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={disabled || (!hasStored && d.length === 0)}
            aria-label={
              revealStored ? "Zugangsdaten verbergen" : "Zugangsdaten anzeigen"
            }
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (d.length > 0) {
                setRevealStored((v) => !v);
                return;
              }
              if (hasStored) {
                setRevealStored((v) => !v);
                setEditing(false);
              }
            }}
          >
            {revealStored ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
