/**
 * 🎬 TIMELINE HELPER FUNCTIONS
 * Extracted from VideoEditorTimeline for better maintainability
 */

export const MIN_BEAT_DURATION_SEC = 1;

export interface Beat {
  id: string;
  pct_from: number;
  pct_to: number;
  label?: string;
}

export interface TrimLeftResult {
  newPctFrom: number;
  rippleBeats: Beat[]; // 🆕 Beats that were pushed/pulled
}

export interface TrimRightResult {
  newPctTo: number;
  rippleBeats: Beat[]; // 🆕 Beats that were pushed/pulled
}

/**
 * 🧲 CapCut-Style Ripple: Trim beat from LEFT handle
 * Previous beats STICK to the start of current beat (gapless to the left)
 * while each beat keeps its own duration.
 */
export function trimBeatLeft(
  beat: Beat,
  beats: Beat[],
  newSec: number,
  duration: number,
  beatMagnetEnabled: boolean,
  snapTime: (
    time: number,
    beats: Beat[],
    duration: number,
    pxPerSec: number,
    options?: { excludeBeatId?: string; snapToPlayheadSec?: number }
  ) => number,
  pxPerSec: number,
  currentTimeRef: number
): TrimLeftResult {
  const beatEndSec = (beat.pct_to / 100) * duration;

  // Clamp to min duration and bounds
  let clampedSec = Math.max(0, Math.min(beatEndSec - MIN_BEAT_DURATION_SEC, newSec));

  // 🧲 SNAP (if magnet enabled)
  if (beatMagnetEnabled) {
    clampedSec = snapTime(clampedSec, beats, duration, pxPerSec, {
      excludeBeatId: beat.id,
      snapToPlayheadSec: currentTimeRef
    });
  }

  // Enforce min duration again after snapping
  clampedSec = Math.min(beatEndSec - MIN_BEAT_DURATION_SEC, clampedSec);
  const newPctFrom = (clampedSec / duration) * 100;

  // 🚀 GAPLESS RIPPLE LEFT: previous beats end exactly at current beat start.
  const rippleBeats: Beat[] = [];
  const sortedBeats = [...beats].sort((a, b) => a.pct_from - b.pct_from);
  const beatIndex = sortedBeats.findIndex((b) => b.id === beat.id);
  if (beatIndex > 0) {
    let currentFromPct = newPctFrom;
    for (let i = beatIndex - 1; i >= 0; i--) {
      const b = sortedBeats[i];
      const beatDurationPct = b.pct_to - b.pct_from;
      const newToPct = currentFromPct;
      const newFromPct = currentFromPct - beatDurationPct;
      if (newToPct <= 0) break;
      rippleBeats.push({
        ...b,
        pct_from: Math.max(0, newFromPct),
        pct_to: Math.max(0, newToPct),
      });
      currentFromPct = Math.max(0, newFromPct);
      if (currentFromPct <= 0) break;
    }
  }

  return { newPctFrom, rippleBeats };
}

/**
 * 🧲 CapCut-Style Ripple: Trim beat from RIGHT handle
 * Next beat STICKS to the end of current beat (gapless)
 * All subsequent beats shift to maintain their relative spacing
 */
export function trimBeatRight(
  beat: Beat,
  beats: Beat[],
  newSec: number,
  duration: number,
  beatMagnetEnabled: boolean,
  snapTime: (
    time: number,
    beats: Beat[],
    duration: number,
    pxPerSec: number,
    options?: { excludeBeatId?: string; snapToPlayheadSec?: number }
  ) => number,
  pxPerSec: number,
  currentTimeRef: number
): TrimRightResult {
  const beatStartSec = (beat.pct_from / 100) * duration;
  const oldEndSec = (beat.pct_to / 100) * duration;
  
  // Clamp to min duration and bounds
  let clampedSec = Math.max(beatStartSec + MIN_BEAT_DURATION_SEC, Math.min(duration, newSec));
  
  // 🧲 SNAP (if magnet enabled)
  if (beatMagnetEnabled) {
    clampedSec = snapTime(clampedSec, beats, duration, pxPerSec, {
      excludeBeatId: beat.id,
      snapToPlayheadSec: currentTimeRef
    });
  }
  
  // Enforce min duration again after snapping
  clampedSec = Math.max(beatStartSec + MIN_BEAT_DURATION_SEC, clampedSec);
  
  const newPctTo = (clampedSec / duration) * 100;
  
  // 🚀 GAPLESS RIPPLE: Next beat STICKS to current beat's end
  const rippleBeats: Beat[] = [];
  
  // Sort beats by start position to find beats to the right
  const sortedBeats = [...beats].sort((a, b) => a.pct_from - b.pct_from);
  const beatIndex = sortedBeats.findIndex(b => b.id === beat.id);
  
  if (beatIndex >= 0 && beatIndex < sortedBeats.length - 1) {
    // Start from the new end position of the current beat
    let currentEndPct = newPctTo;
    
    // Ripple each beat to the right, making them stick together (gapless)
    for (let i = beatIndex + 1; i < sortedBeats.length; i++) {
      const b = sortedBeats[i];
      const beatDurationPct = b.pct_to - b.pct_from; // Preserve beat duration
      
      // This beat starts exactly where the previous beat ended (NO GAP)
      const newFromPct = currentEndPct;
      const newToPct = currentEndPct + beatDurationPct;
      
      // Stop if we exceed timeline bounds
      if (newFromPct >= 100) break;
      
      rippleBeats.push({
        ...b,
        pct_from: newFromPct,
        pct_to: Math.min(100, newToPct)
      });
      
      // Update for next iteration
      currentEndPct = Math.min(100, newToPct);
    }
  }
  
  return { newPctTo, rippleBeats };
}
