# 🎬 Timeline Zoom - Quick Reference

## ⚡ TL;DR

```typescript
// Core Formula
timelineWidthPx = durationSec × pxPerSec
pxPerSec = 2 × 100^zoom

// Range
zoom:     0.0 ────────► 1.0
pxPerSec: 2 px/s ─────► 200 px/s
ratio:    100x zoom range!
```

---

## 📐 Essential Formulas

| Formula              | Code                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| **Timeline Width**   | `timelineWidthPx = durationSec * pxPerSec`                           |
| **Zoom → pxPerSec**  | `pxPerSec = 2 * Math.pow(100, zoom)`                                 |
| **pxPerSec → Zoom**  | `zoom = Math.log(pxPerSec / 2) / Math.log(100)`                      |
| **Visible Duration** | `visibleSec = viewportWidth / pxPerSec`                              |
| **Initial Zoom**     | `pxPerSec = Math.min(200, Math.max(2, viewportWidth / durationSec))` |

---

## 🎯 Quick Values

| Zoom   | pxPerSec    | 10min Film Width | 1200px Viewport Shows |
| ------ | ----------- | ---------------- | --------------------- |
| `0.0`  | `2 px/s`    | `1,200px`        | `600s (10 min)`       |
| `0.25` | `~5.6 px/s` | `3,360px`        | `~214s (3.6 min)`     |
| `0.5`  | `20 px/s`   | `12,000px`       | `60s (1 min)`         |
| `0.75` | `~63 px/s`  | `~37,800px`      | `~19s`                |
| `1.0`  | `200 px/s`  | `120,000px`      | `6s`                  |

---

## 🔧 Constants

```typescript
// /components/VideoEditorTimeline.tsx
const MIN_PX_PER_SEC = 2; // Lines 39
const MAX_PX_PER_SEC = 200; // Lines 40
const MIN_LABEL_SPACING_PX = 80; // Line 43
```

---

## 🎚️ Functions

```typescript
// Lines 52-56
function pxPerSecFromZoom(zoom: number): number {
  const ratio = MAX_PX_PER_SEC / MIN_PX_PER_SEC; // = 100
  return MIN_PX_PER_SEC * Math.pow(ratio, zoom); // = 2 * 100^zoom
}

// Lines 58-62
function zoomFromPxPerSec(px: number): number {
  const ratio = MAX_PX_PER_SEC / MIN_PX_PER_SEC;
  return Math.log(px / MIN_PX_PER_SEC) / Math.log(ratio);
}

// Lines 64-71
function chooseTickStep(pxPerSecond: number): number {
  const minSecondsBetweenTicks = MIN_LABEL_SPACING_PX / pxPerSecond;
  return (
    TIME_STEPS_SECONDS.find((step) => step >= minSecondsBetweenTicks) ??
    TIME_STEPS_SECONDS[TIME_STEPS_SECONDS.length - 1]
  );
}
```

---

## 🎯 Common Operations

### Get Timeline Width

```typescript
const totalWidthPx = totalDurationSec * pxPerSec;
```

### Get Visible Time Range

```typescript
const viewStartSec = scrollLeft / pxPerSec;
const viewEndSec = viewStartSec + viewportWidth / pxPerSec;
```

### Convert Pixel → Time

```typescript
const timeSec = pixelX / pxPerSec;
```

### Convert Time → Pixel

```typescript
const pixelX = timeSec * pxPerSec;
```

### Anchored Zoom

```typescript
const timeUnderCursor = (scrollLeft + cursorX) / oldPxPerSec;
const newScrollLeft = timeUnderCursor * newPxPerSec - cursorX;
```

---

## 📖 Book Duration Calculation

```typescript
const durationSec = (totalWords / readingSpeedWpm) * 60;

// Example:
// 30,000 words ÷ 150 WPM × 60 = 12,000 seconds = 200 minutes
```

---

## 🚀 Performance Tips

1. **RAF for Playhead** - 60fps smooth animation
2. **Throttle State Updates** - Max 10x/sec
3. **Viewport Culling** - Only render visible items
4. **No Debouncing on Zoom** - Instant feedback via RAF

---

## 🐛 Common Issues

### Timeline too wide?

```typescript
// Reduce pxPerSec or decrease zoom
setZoom(Math.max(0, zoom - 0.1));
```

### Timeline too narrow?

```typescript
// Increase pxPerSec or increase zoom
setZoom(Math.min(1, zoom + 0.1));
```

### Ticks overlapping?

```typescript
// Automatically handled by chooseTickStep()
// Increases step size when zoomed out
```

### Playhead stuttering?

```typescript
// Use RAF loop with delta time interpolation
// Already implemented in VideoEditorTimeline
```

---

## 📝 Code Locations

| Feature          | File                      | Lines   |
| ---------------- | ------------------------- | ------- |
| Constants        | `VideoEditorTimeline.tsx` | 38-50   |
| Zoom Functions   | `VideoEditorTimeline.tsx` | 52-71   |
| State            | `VideoEditorTimeline.tsx` | 125-133 |
| Timeline Width   | `VideoEditorTimeline.tsx` | 501     |
| Anchored Zoom    | `VideoEditorTimeline.tsx` | 612-632 |
| Initial Auto-Fit | `VideoEditorTimeline.tsx` | 477-498 |
| RAF Playhead     | `VideoEditorTimeline.tsx` | 524-590 |

---

## 🎓 Learning Resources

- Full Analysis: `/TIMELINE_ZOOM_ANALYSIS.md`
- Visualizations: `/TIMELINE_ZOOM_VISUALIZATION.md`
- JSON API: `/TIMELINE_ZOOM_ANALYSIS.json`

---

**Last Updated:** 2024-11-23  
**Version:** 1.0  
**Status:** ✅ Complete
