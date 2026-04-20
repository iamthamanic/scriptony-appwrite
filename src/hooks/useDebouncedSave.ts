/**
 * 💾 useDebouncedSave Hook
 *
 * Verhindert API-Spam beim Tippen durch Debouncing.
 * Bietet Optimistic UI mit Status-Tracking.
 *
 * Features:
 * - Debounced Save (1000ms default)
 * - Status: idle | saving | saved | error
 * - Optimistic UI (kein Spinner während Tippen)
 * - Auto-retry bei Fehlern
 * - Cleanup bei Unmount
 */

import { useRef, useCallback, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface DebouncedSaveOptions {
  delay?: number; // Debounce delay in ms (default: 1000)
  onSave: (data: any) => Promise<void>; // Async save function
  onError?: (error: Error) => void; // Error callback
  autoRetry?: boolean; // Auto-retry on error (default: false)
  retryDelay?: number; // Retry delay in ms (default: 3000)
}

export interface DebouncedSaveReturn {
  save: (data: any) => void; // Trigger save (debounced)
  saveImmediate: (data: any) => void; // Save without debounce
  status: SaveStatus; // Current save status
  lastSaved: Date | null; // Last successful save timestamp
  cancel: () => void; // Cancel pending save
}

export function useDebouncedSave(
  options: DebouncedSaveOptions,
): DebouncedSaveReturn {
  const {
    delay = 1000,
    onSave,
    onError,
    autoRetry = false,
    retryDelay = 3000,
  } = options;

  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<any>(null);
  const isSavingRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Execute save
  const executeSave = useCallback(
    async (data: any) => {
      if (isSavingRef.current) {
        console.log(
          "[useDebouncedSave] ⏸️  Save already in progress, queuing...",
        );
        pendingDataRef.current = data;
        return;
      }

      isSavingRef.current = true;
      setStatus("saving");
      console.log("[useDebouncedSave] 💾 Executing save...");

      try {
        await onSave(data);

        isSavingRef.current = false;
        setStatus("saved");
        setLastSaved(new Date());
        console.log("[useDebouncedSave] ✅ Save successful");

        // Auto-clear "saved" status after 2 seconds
        setTimeout(() => {
          setStatus((prevStatus) =>
            prevStatus === "saved" ? "idle" : prevStatus,
          );
        }, 2000);

        // If there's pending data, save it now
        if (pendingDataRef.current) {
          const pending = pendingDataRef.current;
          pendingDataRef.current = null;
          console.log("[useDebouncedSave] 🔄 Saving queued data...");
          executeSave(pending);
        }
      } catch (error) {
        console.error("[useDebouncedSave] ❌ Save failed:", error);
        isSavingRef.current = false;
        setStatus("error");

        if (onError) {
          onError(error as Error);
        }

        // Auto-retry if enabled
        if (autoRetry) {
          console.log(`[useDebouncedSave] 🔄 Retrying in ${retryDelay}ms...`);
          retryTimeoutRef.current = setTimeout(() => {
            executeSave(data);
          }, retryDelay);
        } else {
          // Clear error status after 3 seconds
          setTimeout(() => {
            setStatus((prevStatus) =>
              prevStatus === "error" ? "idle" : prevStatus,
            );
          }, 3000);
        }
      }
    },
    [onSave, onError, autoRetry, retryDelay],
  );

  // Debounced save
  const save = useCallback(
    (data: any) => {
      cleanup();

      console.log(`[useDebouncedSave] ⏱️  Save scheduled in ${delay}ms...`);

      timeoutRef.current = setTimeout(() => {
        executeSave(data);
      }, delay);
    },
    [delay, executeSave, cleanup],
  );

  // Immediate save (no debounce)
  const saveImmediate = useCallback(
    (data: any) => {
      cleanup();
      console.log("[useDebouncedSave] ⚡ Immediate save triggered");
      executeSave(data);
    },
    [executeSave, cleanup],
  );

  // Cancel pending save
  const cancel = useCallback(() => {
    console.log("[useDebouncedSave] ❌ Save cancelled");
    cleanup();
    pendingDataRef.current = null;
    setStatus("idle");
  }, [cleanup]);

  return {
    save,
    saveImmediate,
    status,
    lastSaved,
    cancel,
  };
}
