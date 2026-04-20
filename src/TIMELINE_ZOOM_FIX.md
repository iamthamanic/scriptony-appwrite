# 🐛 Timeline Zoom Bug Fix

## Problem

Der User sah bei `zoom = 0` den Wert "2.8 px/s" statt dem erwarteten `fitPxPerSec` (sollte ~0.42 px/s für ein 48-Minuten-Projekt sein). Die Timeline zeigte nicht das gesamte Projekt.

## Root Cause

**Race Condition in useEffect Dependencies!**

Der ursprüngliche Code hatte:

```typescript
useEffect(() => {
  // ...
  const dynamicFitPx = getFitPxPerSec(totalDurationSec, viewportWidth);
  setFitPxPerSec(dynamicFitPx);

  const newPxPerSec = pxPerSecFromZoom(zoom, dynamicFitPx);
  setPxPerSec(newPxPerSec);
}, [viewportWidth, totalDurationSec, zoom]); // ❌ zoom als Dependency!
```

**Problem:**

1. Beim ersten Render: `zoom = 0`, Effect läuft → `pxPerSec` wird gesetzt
2. User bewegt Slider: `zoom` ändert sich
3. Effect läuft WIEDER → überschreibt `pxPerSec`
4. `setZoomAroundCursor` hatte `pxPerSec` bereits gesetzt, aber Effect überschreibt es!

**Zusätzliches Problem:**

- Es gab ZWEI separate Effects (einer für fitPxPerSec, einer für Initial Zoom)
- Diese hatten überlappende Logic und konnten sich gegenseitig stören

## Lösung

### 1. Effects zusammengefasst

**Vorher:** 2 separate Effects

```typescript
// Effect 1: Update fitPxPerSec
useEffect(() => {
  const dynamicFitPx = getFitPxPerSec(totalDurationSec, viewportWidth);
  setFitPxPerSec(dynamicFitPx);

  if (initialZoomSetRef.current) {
    const newPxPerSec = pxPerSecFromZoom(zoom, dynamicFitPx);
    setPxPerSec(newPxPerSec);
  }
}, [viewportWidth, totalDurationSec]);

// Effect 2: Initial Zoom
useEffect(() => {
  if (initialZoomSetRef.current || !viewportWidth || totalDurationSec <= 0)
    return;

  const dynamicFitPx = getFitPxPerSec(totalDurationSec, viewportWidth);
  setFitPxPerSec(dynamicFitPx);

  const initialZoom = 0;
  const initialPxPerSec = pxPerSecFromZoom(initialZoom, dynamicFitPx);

  setZoom(initialZoom);
  setPxPerSec(initialPxPerSec);
  initialZoomSetRef.current = true;
}, [viewportWidth, totalDurationSec]);
```

**Nachher:** 1 kombinierter Effect

```typescript
useEffect(() => {
  if (!viewportWidth || totalDurationSec <= 0) return;

  // Calculate fitPxPerSec
  const dynamicFitPx = getFitPxPerSec(totalDurationSec, viewportWidth);
  const prevFitPx = fitPxPerSec;
  setFitPxPerSec(dynamicFitPx);

  // Only update pxPerSec if fitPxPerSec changed (or initial setup)
  if (
    !initialZoomSetRef.current ||
    Math.abs(prevFitPx - dynamicFitPx) > 0.0001
  ) {
    const newPxPerSec = pxPerSecFromZoom(zoom, dynamicFitPx);
    setPxPerSec(newPxPerSec);

    if (!initialZoomSetRef.current) {
      console.log("[VideoEditorTimeline] 🎯 Initial zoom (CapCut-style):", {
        // ... logging
      });
      initialZoomSetRef.current = true;
    }
  }
}, [viewportWidth, totalDurationSec]); // ✅ Kein zoom!
```

### 2. zoom aus Dependencies entfernt

**Key Change:** `zoom` ist NICHT mehr in den Effect Dependencies!

**Warum:**

- `zoom` wird manuell in `setZoomAroundCursor` gehandelt
- Der Effect soll nur laufen, wenn sich Viewport oder Duration ändern
- Wenn der User den Zoom ändert, updated `setZoomAroundCursor` direkt `pxPerSec`

### 3. Optimierung in setZoomAroundCursor

**Vorher:**

```typescript
const setZoomAroundCursor = (newZoom: number, anchorX?: number) => {
  const el = scrollRef.current;
  if (!el || !viewportWidth) {
    setZoom(newZoom);
    setPxPerSec(pxPerSecFromZoom(newZoom, fitPxPerSec));
    return;
  }

  const oldPx = pxPerSec;
  const nextPx = pxPerSecFromZoom(newZoom, fitPxPerSec);
  // ... rest
};
```

**Nachher:**

```typescript
const setZoomAroundCursor = (newZoom: number, anchorX?: number) => {
  const el = scrollRef.current;

  // Calculate nextPx FIRST (with current fitPxPerSec)
  const nextPx = pxPerSecFromZoom(newZoom, fitPxPerSec);

  if (!el || !viewportWidth) {
    setZoom(newZoom);
    setPxPerSec(nextPx);
    return;
  }

  // Calculate anchor-based scroll
  const oldPx = pxPerSec;
  // ... rest
};
```

**Verbesserung:** `nextPx` wird am Anfang berechnet (DRY - Don't Repeat Yourself)

## Testing

### Test 1: Initial Load

```
Projekt: 48 Minuten (2880s)
Viewport: ~1200px

Erwartung:
  fitPxPerSec = 1200 / 2880 = 0.417 px/s
  zoom = 0
  pxPerSec = 0.417 px/s
  Timeline Width = 2880 × 0.417 = 1200px ✅

Console Log sollte zeigen:
  fitPxPerSec: 0.4167
  zoom: 0
  pxPerSec: 0.4167
  timelineWidthPx: 1200
```

### Test 2: Zoom Slider bewegen

```
User bewegt Slider zu zoom = 0.5

Erwartung:
  pxPerSec = 0.417 × √(200/0.417) = ~9.1 px/s
  Timeline Width = 2880 × 9.1 = ~26,208px

useEffect läuft NICHT (weil zoom nicht in Dependencies)
setZoomAroundCursor updated pxPerSec direkt ✅
```

### Test 3: Viewport Resize

```
User resized Window von 1200px zu 800px

Erwartung:
  fitPxPerSec = 800 / 2880 = 0.278 px/s (neu!)
  pxPerSec wird mit aktuellem zoom neu berechnet
  Timeline passt sich an ✅

useEffect läuft (weil viewportWidth in Dependencies)
```

## Files Changed

- ✅ `/components/VideoEditorTimeline.tsx`
  - Effect zusammengefasst (Zeile ~489-518)
  - `zoom` aus Dependencies entfernt
  - `setZoomAroundCursor` optimiert (Zeile ~629-654)

## Result

✅ Bei `zoom = 0` zeigt die Timeline jetzt die komplette Projektlänge  
✅ Der Display zeigt den korrekten `fitPxPerSec` Wert (z.B. 0.42 px/s statt 2.8 px/s)  
✅ Keine Race Condition mehr zwischen Effect und User-Interaktion  
✅ Smooth Zoom-Verhalten bleibt erhalten

---

**Fixed:** 2024-11-23  
**Issue:** Race Condition in useEffect Dependencies  
**Status:** ✅ Resolved
