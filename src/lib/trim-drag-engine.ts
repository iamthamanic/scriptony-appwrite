/**
 * 🎬 TRIM DRAG ENGINE
 *
 * Ephemeral drag state manager for timeline trim operations.
 * During drag: calculations stored in refs, visual updates via rAF + transform.
 * On commit (pointerup): single state update + DB persist.
 *
 * This eliminates React re-renders during drag (the #1 smoothness killer).
 *
 * Usage in component:
 *   const engine = useTrimDragEngine();
 *   onPointerDown → engine.startBeatTrim(...)
 *   onPointerMove → engine.updateBeatTrim(...)
 *   onPointerUp   → engine.commitBeatTrim() → returns final state for dispatch
 */

import { useRef, useCallback } from "react";
import {
  trimBeatLeft,
  trimBeatRight,
  type Beat,
  type TrimLeftResult,
  type TrimRightResult,
} from "../components/timeline-helpers";

// ─── Types ───────────────────────────────────────────────────────────

export interface BeatTrimDragState {
  beatId: string;
  handle: "left" | "right";
  startX: number;
  startSec: number;
  snapshot: Beat[]; // Snapshot of all beats at drag start (for rollback)
  // Current ephemeral results (updated every pointermove, never committed to React state)
  preview: {
    trimmedBeat: { pct_from: number; pct_to: number };
    rippleBeats: Beat[];
  } | null;
}

export interface ClipTrimDragState {
  kind: "act" | "sequence" | "scene" | "shot";
  clipId: string;
  handle: "left" | "right";
  startX: number;
  boundaryStartSec: number;
  // Snapshot of manual timings at drag start
  snapshot: Record<string, { pct_from: number; pct_to: number }>;
  // Current ephemeral results
  preview: Record<string, { pct_from: number; pct_to: number }> | null;
}

// ─── Visual Update Helpers ───────────────────────────────────────────

/**
 * Apply ephemeral visual positions to beat DOM elements via transform.
 * This bypasses React entirely — pure DOM manipulation for 60fps.
 */
export function applyBeatPreviewToDOM(
  containerEl: HTMLElement | null,
  beats: Beat[],
  trimmedBeatId: string,
  trimResult: { pct_from: number; pct_to: number },
  rippleBeats: Beat[],
  duration: number,
  pxPerSec: number,
  viewStartSec: number,
) {
  if (!containerEl) return;

  // Build a map of beatId → { pct_from, pct_to }
  const positions = new Map<string, { pct_from: number; pct_to: number }>();

  // Start with all beats at their current positions
  for (const b of beats) {
    positions.set(b.id, { pct_from: b.pct_from, pct_to: b.pct_to });
  }

  // Override with trimmed beat
  positions.set(trimmedBeatId, trimResult);

  // Override with rippled beats
  for (const rb of rippleBeats) {
    positions.set(rb.id, { pct_from: rb.pct_from, pct_to: rb.pct_to });
  }

  // Apply to DOM
  for (const [beatId, pos] of positions) {
    const el = containerEl.querySelector(
      `[data-beat-id="${beatId}"]`,
    ) as HTMLElement | null;
    if (!el) continue;

    const startSec = (pos.pct_from / 100) * duration;
    const endSec = (pos.pct_to / 100) * duration;
    const x = (startSec - viewStartSec) * pxPerSec;
    const width = (endSec - startSec) * pxPerSec;

    el.style.transform = `translateX(${x}px)`;
    el.style.width = `${Math.max(2, width)}px`;
    // Remove any left positioning (we're using transform now)
    el.style.left = "0";
  }
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useTrimDragEngine() {
  const beatDragRef = useRef<BeatTrimDragState | null>(null);
  const clipDragRef = useRef<ClipTrimDragState | null>(null);
  const rafRef = useRef<number | null>(null);

  // ── Beat Trim ──

  const startBeatTrim = useCallback(
    (
      beatId: string,
      handle: "left" | "right",
      clientX: number,
      startSec: number,
      beats: Beat[],
    ) => {
      beatDragRef.current = {
        beatId,
        handle,
        startX: clientX,
        startSec,
        snapshot: beats.map((b) => ({ ...b })),
        preview: null,
      };
    },
    [],
  );

  const updateBeatTrim = useCallback(
    (
      clientX: number,
      beats: Beat[],
      duration: number,
      pxPerSec: number,
      beatMagnetEnabled: boolean,
      snapTimeFn: (
        time: number,
        beats: Beat[],
        duration: number,
        pxPerSec: number,
        options?: { excludeBeatId?: string; snapToPlayheadSec?: number },
      ) => number,
      currentTimeSec: number,
    ) => {
      const drag = beatDragRef.current;
      if (!drag) return null;

      const deltaX = clientX - drag.startX;
      const deltaSec = deltaX / pxPerSec;
      const newSec = drag.startSec + deltaSec;

      const beat = beats.find((b) => b.id === drag.beatId);
      if (!beat) return null;

      let result: {
        trimmedBeat: { pct_from: number; pct_to: number };
        rippleBeats: Beat[];
      };

      if (drag.handle === "left") {
        const trimResult = trimBeatLeft(
          beat,
          beats,
          newSec,
          duration,
          beatMagnetEnabled,
          snapTimeFn,
          pxPerSec,
          currentTimeSec,
        );
        result = {
          trimmedBeat: { pct_from: trimResult.newPctFrom, pct_to: beat.pct_to },
          rippleBeats: trimResult.rippleBeats,
        };
      } else {
        const trimResult = trimBeatRight(
          beat,
          beats,
          newSec,
          duration,
          beatMagnetEnabled,
          snapTimeFn,
          pxPerSec,
          currentTimeSec,
        );
        result = {
          trimmedBeat: { pct_from: beat.pct_from, pct_to: trimResult.newPctTo },
          rippleBeats: trimResult.rippleBeats,
        };
      }

      drag.preview = result;
      return result;
    },
    [],
  );

  const commitBeatTrim = useCallback((): {
    beatId: string;
    handle: "left" | "right";
    trimmedBeat: { pct_from: number; pct_to: number };
    rippleBeats: Beat[];
    snapshot: Beat[];
  } | null => {
    const drag = beatDragRef.current;
    if (!drag) {
      return null;
    }

    // No pointermove before pointerup: commit identity so callers can always tear down (no null commit).
    if (!drag.preview) {
      const b = drag.snapshot.find((x) => x.id === drag.beatId);
      if (!b) {
        beatDragRef.current = null;
        return null;
      }
      drag.preview = {
        trimmedBeat: { pct_from: b.pct_from, pct_to: b.pct_to },
        rippleBeats: [],
      };
    }

    const result = {
      beatId: drag.beatId,
      handle: drag.handle,
      trimmedBeat: drag.preview.trimmedBeat,
      rippleBeats: drag.preview.rippleBeats,
      snapshot: drag.snapshot,
    };

    beatDragRef.current = null;
    return result;
  }, []);

  const cancelBeatTrim = useCallback((): Beat[] | null => {
    const drag = beatDragRef.current;
    if (!drag) return null;
    const snapshot = drag.snapshot;
    beatDragRef.current = null;
    return snapshot;
  }, []);

  const isBeatTrimActive = useCallback(() => !!beatDragRef.current, []);

  // ── Clip Trim ──

  const startClipTrim = useCallback(
    (
      kind: "act" | "sequence" | "scene" | "shot",
      clipId: string,
      handle: "left" | "right",
      clientX: number,
      boundarySec: number,
      snapshot: Record<string, { pct_from: number; pct_to: number }>,
    ) => {
      clipDragRef.current = {
        kind,
        clipId,
        handle,
        startX: clientX,
        boundaryStartSec: boundarySec,
        snapshot,
        preview: null,
      };
    },
    [],
  );

  const updateClipTrimPreview = useCallback(
    (preview: Record<string, { pct_from: number; pct_to: number }>) => {
      if (!clipDragRef.current) return;
      clipDragRef.current.preview = preview;
    },
    [],
  );

  const commitClipTrim = useCallback((): {
    kind: "act" | "sequence" | "scene" | "shot";
    preview: Record<string, { pct_from: number; pct_to: number }>;
    snapshot: Record<string, { pct_from: number; pct_to: number }>;
  } | null => {
    const drag = clipDragRef.current;
    if (!drag || !drag.preview) {
      clipDragRef.current = null;
      return null;
    }
    const result = {
      kind: drag.kind,
      preview: drag.preview,
      snapshot: drag.snapshot,
    };
    clipDragRef.current = null;
    return result;
  }, []);

  const cancelClipTrim = useCallback(() => {
    const drag = clipDragRef.current;
    clipDragRef.current = null;
    return drag?.snapshot ?? null;
  }, []);

  const isClipTrimActive = useCallback(() => !!clipDragRef.current, []);

  // ── rAF Management ──

  const scheduleRAF = useCallback((fn: () => void) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      fn();
      rafRef.current = null;
    });
  }, []);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    beatDragRef.current = null;
    clipDragRef.current = null;
  }, []);

  return {
    // Beat trim
    startBeatTrim,
    updateBeatTrim,
    commitBeatTrim,
    cancelBeatTrim,
    isBeatTrimActive,
    beatDragRef,
    // Clip trim
    startClipTrim,
    updateClipTrimPreview,
    commitClipTrim,
    cancelClipTrim,
    isClipTrimActive,
    clipDragRef,
    // Utilities
    scheduleRAF,
    cleanup,
  };
}
