// CLEAN RIGHT HANDLE LOGIC - CapCut/DaVinci Magnet Style

// RIGHT HANDLE: Resize from end
const oldStartSec = (beat.pct_from / 100) * duration;
let clampedEndSec = Math.max(
  oldStartSec + MIN_BEAT_DURATION_SEC,
  Math.min(duration, newSec),
);
let newPctTo = (clampedEndSec / duration) * 100;

// Find adjacent beat
const otherBeats = beats
  .filter((b) => b.id !== trimingBeat.id)
  .sort((a, b) => a.pct_from - b.pct_from);

// Find beat immediately below (closest beat that starts AFTER CURRENT end)
const beatsBelow = otherBeats.filter((b) => b.pct_from >= beat.pct_to);
const beatBelow = beatsBelow.length > 0 ? beatsBelow[0] : null;

console.log(
  `[Beat Trim] RIGHT: "${beat.label}" extending to ${newPctTo.toFixed(1)}%`,
  {
    magnetEnabled: beatMagnetEnabled,
    currentEnd: beat.pct_to.toFixed(1),
    beatBelow: beatBelow
      ? `"${beatBelow.label}" starts at ${beatBelow.pct_from.toFixed(1)}%`
      : "none",
  },
);

// CAPCUT/DAVINCI MAGNET: Snapping + Hard Stop (NO pushing)
if (beatBelow) {
  // SNAP if close enough and magnet enabled
  if (beatMagnetEnabled) {
    const distance = Math.abs(newPctTo - beatBelow.pct_from);
    if (distance < SNAP_THRESHOLD_PERCENT) {
      console.log(`[Beat Trim] MAGNET SNAP! Distance=${distance.toFixed(2)}%`);
      newPctTo = beatBelow.pct_from;
    }
  }

  // HARD STOP: Prevent overlap (always active)
  if (newPctTo > beatBelow.pct_from) {
    console.log(`[Beat Trim] HARD STOP at ${beatBelow.pct_from.toFixed(1)}%`);
    newPctTo = beatBelow.pct_from;
  }
}

// Min beat duration
const minAllowed = beat.pct_from + (MIN_BEAT_DURATION_SEC / duration) * 100;
newPctTo = Math.max(newPctTo, minAllowed);

setBeats((prev) =>
  prev.map((b) => (b.id === trimingBeat.id ? { ...b, pct_to: newPctTo } : b)),
);
