/**
 * 💀 ContentSkeleton - Skeleton Loader für Text-Content
 *
 * Zeigt Skeleton-UI während Content lazy-geladen wird.
 * Verwendet für Tiptap-Editor Content.
 */

import React from "react";

export function ContentSkeleton() {
  return (
    <div className="space-y-2 animate-pulse p-2">
      {/* Line 1 - Full width */}
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>

      {/* Line 2 - Full width */}
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>

      {/* Line 3 - 90% width */}
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-[90%]"></div>

      {/* Line 4 - 95% width */}
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-[95%]"></div>

      {/* Line 5 - 80% width */}
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-[80%]"></div>
    </div>
  );
}

export function ContentSkeletonInline() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground/50 italic p-2">
      <div className="size-3 border-2 border-muted-foreground/30 border-t-transparent rounded-full animate-spin"></div>
      <span>Inhalt wird geladen...</span>
    </div>
  );
}
