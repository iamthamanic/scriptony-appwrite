/**
 * 💾 SaveStatusBadge - Zeigt den Save-Status des Editors an
 *
 * Farben:
 * - idle: versteckt
 * - saving: grau (Saving...)
 * - saved: grün (Saved)
 * - error: rot (Error)
 */

import React from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import type { SaveStatus } from "../hooks/useDebouncedSave";

export interface SaveStatusBadgeProps {
  status: SaveStatus;
  lastSaved?: Date | null;
  className?: string;
}

export function SaveStatusBadge({
  status,
  lastSaved,
  className = "",
}: SaveStatusBadgeProps) {
  // Don't render if idle
  if (status === "idle") {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case "saving":
        return {
          icon: <Loader2 className="size-3 animate-spin" />,
          text: "Speichert...",
          bgColor: "bg-slate-100 dark:bg-slate-800",
          textColor: "text-slate-600 dark:text-slate-400",
          borderColor: "border-slate-200 dark:border-slate-700",
        };
      case "saved":
        return {
          icon: <Check className="size-3" />,
          text: "Gespeichert",
          bgColor: "bg-green-50 dark:bg-green-950/30",
          textColor: "text-green-600 dark:text-green-400",
          borderColor: "border-green-200 dark:border-green-800",
        };
      case "error":
        return {
          icon: <AlertCircle className="size-3" />,
          text: "Fehler",
          bgColor: "bg-red-50 dark:bg-red-950/30",
          textColor: "text-red-600 dark:text-red-400",
          borderColor: "border-red-200 dark:border-red-800",
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-md border
        text-xs font-medium transition-all
        ${config.bgColor}
        ${config.textColor}
        ${config.borderColor}
        ${className}
      `}
    >
      {config.icon}
      <span>{config.text}</span>

      {/* Show last saved time for 'saved' status */}
      {status === "saved" && lastSaved && (
        <span className="opacity-60 ml-1">{formatLastSaved(lastSaved)}</span>
      )}
    </div>
  );
}

function formatLastSaved(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return "gerade";
  if (diffSec < 60) return `vor ${diffSec}s`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin}m`;

  const diffHour = Math.floor(diffMin / 60);
  return `vor ${diffHour}h`;
}
