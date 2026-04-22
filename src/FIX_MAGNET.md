# FIX: Remove Pushing Logic, Keep Only CapCut Magnet

## Problem

Die Datei `/components/VideoEditorTimeline.tsx` hat ab Zeile 458 eine komplexe "Beat Pushing" Logic die wir nicht wollen.

## Solution

Ersetze Zeilen 458-521 mit dieser einfachen CapCut/DaVinci Magnet Logic:

```typescript
// 🧲 CAPCUT/DAVINCI MAGNET: Snapping + Hard Stop (NO pushing)
if (beatBelow) {
  // SNAP if close enough and magnet enabled
  if (beatMagnetEnabled) {
    const distance = Math.abs(newPctTo - beatBelow.pct_from);
    if (distance < SNAP_THRESHOLD_PERCENT) {
      console.log(`[Beat Trim] MAGNET SNAP Distance=${distance.toFixed(2)}%`);
      newPctTo = beatBelow.pct_from;
    }
  }

  // HARD STOP: Prevent overlap (always active)
  if (newPctTo > beatBelow.pct_from) {
    console.log(`[Beat Trim] HARD STOP at ${beatBelow.pct_from.toFixed(1)}%`);
    newPctTo = beatBelow.pct_from;
  }
}
```

## Manual Steps

1. Open `/components/VideoEditorTimeline.tsx`
2. Find line 458 with comment "CAPCUT-STYLE BEAT PUSHING"
3. Delete lines 458-521
4. Paste the new code above
5. Save file
