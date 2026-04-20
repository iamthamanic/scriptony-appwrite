# 🎬 Scriptony Timeline - Zoom System Analyse

## 📊 Überblick

Die Timeline in Scriptony verwendet ein **exponentielles Zoom-System** mit Pixel-per-Second als Einheit.

**Datei:** `/components/VideoEditorTimeline.tsx`

---

## 🎯 1. Zoom-Variablen

### Primäre Variablen

| Variable         | Typ      | Range       | Beschreibung                              |
| ---------------- | -------- | ----------- | ----------------------------------------- |
| `zoom`           | `number` | `0.0 - 1.0` | Normalisierter Slider-Wert (unitless)     |
| `pxPerSec`       | `number` | `2 - 200`   | Pixels per Second (abgeleitet von `zoom`) |
| `MIN_PX_PER_SEC` | `const`  | `2`         | Maximum Zoom Out                          |
| `MAX_PX_PER_SEC` | `const`  | `200`       | Maximum Zoom In                           |

### Code-Referenzen

```typescript
// Lines 38-40
const MIN_PX_PER_SEC = 2; // Maximum zoom out
const MAX_PX_PER_SEC = 200; // Maximum zoom in

// Line 126
const [zoom, setZoom] = useState(0.5);

// Line 127
const [pxPerSec, setPxPerSec] = useState(() => pxPerSecFromZoom(0.5));
```

---

## 📏 2. Einheit

**Haupteinheit:** `Pixels per Second (px/s)`

Die Timeline-Breite wird berechnet, indem die Projektdauer (in Sekunden) mit `pxPerSec` multipliziert wird.

Der `zoom`-Wert (0-1) wird **exponentiell** auf `pxPerSec` gemappt für ein natürliches Zoom-Gefühl.

---

## 🧮 3. Timeline-Breite Formel

### Haupt-Formel

```
timelineWidthPx = totalDurationSec × pxPerSec
```

### Wo:

- `totalDurationSec` = Projektdauer in Sekunden (z.B. 300s = 5min)
- `pxPerSec` = `pxPerSecFromZoom(zoom)`

### pxPerSec Berechnung

```typescript
// Lines 52-56
function pxPerSecFromZoom(zoom: number): number {
  const ratio = MAX_PX_PER_SEC / MIN_PX_PER_SEC; // = 200/2 = 100
  return MIN_PX_PER_SEC * Math.pow(ratio, zoom); // = 2 × 100^zoom
}
```

**Vereinfacht:**

```
pxPerSec = 2 × 100^zoom
```

### Beispiel

```
Projekt: 600s (10 Minuten)
Zoom: 0.5

pxPerSec = 2 × 100^0.5
         = 2 × 10
         = 20 px/s

timelineWidthPx = 600 × 20
                = 12,000px
```

---

## 🎚️ 4. Slider → Scale Formel

### Exponential Mapping

**Formel:**

```
pxPerSec = MIN_PX_PER_SEC × ratio^zoom
pxPerSec = 2 × 100^zoom
```

**Variablen:**

- `MIN_PX_PER_SEC = 2`
- `MAX_PX_PER_SEC = 200`
- `ratio = MAX_PX_PER_SEC / MIN_PX_PER_SEC = 100`
- `zoom = slider value (0.0 - 1.0)`

### Beispiele

| Slider | Zoom | pxPerSec | Berechnung                 | Beschreibung         |
| ------ | ---- | -------- | -------------------------- | -------------------- |
| `0.0`  | 0.0  | `2`      | `2 × 100^0.0 = 2 × 1`      | **Maximum Zoom Out** |
| `0.25` | 0.25 | `~5.62`  | `2 × 100^0.25 = 2 × 3.16`  | Quarter              |
| `0.5`  | 0.5  | `20`     | `2 × 100^0.5 = 2 × 10`     | **Middle**           |
| `0.75` | 0.75 | `~63.25` | `2 × 100^0.75 = 2 × 31.62` | Three Quarters       |
| `1.0`  | 1.0  | `200`    | `2 × 100^1.0 = 2 × 100`    | **Maximum Zoom In**  |

### Inverse Formel (pxPerSec → zoom)

```typescript
// Lines 58-62
function zoomFromPxPerSec(px: number): number {
  const ratio = MAX_PX_PER_SEC / MIN_PX_PER_SEC;
  return Math.log(px / MIN_PX_PER_SEC) / Math.log(ratio);
}
```

**Mathematisch:**

```
zoom = log(pxPerSec / MIN_PX_PER_SEC) / log(ratio)
zoom = log(pxPerSec / 2) / log(100)
zoom = ln(pxPerSec / 2) / ln(100)
```

### Warum Exponential?

**Vorteil:** Natürliches Zoom-Gefühl!

- Bei niederen Zoom-Levels (0.0-0.5): Mehr Präzision
- Bei hohen Zoom-Levels (0.5-1.0): Schnellere Änderungen
- Ähnlich wie CapCut, Premiere Pro, etc.

---

## 🔍 5. Minimaler Zoom Verhalten

### Bei slider = 0.0 (Minimum Zoom):

```
pxPerSec = 2 pixels per second (MIN_PX_PER_SEC)
```

### Sichtbare Zeitspanne im Viewport

```
visibleDurationSec = viewportWidthPx / pxPerSec
visibleDurationSec = viewportWidthPx / 2
```

### ⚠️ WICHTIG: Sichtbare Zeitspanne ist DYNAMISCH!

Die sichtbare Zeitspanne hängt von der **Viewport-Breite** ab:

| Viewport Width | Visible Duration  | Berechnung |
| -------------- | ----------------- | ---------- |
| `800px`        | `400s = 6.67 min` | `800 / 2`  |
| `1200px`       | `600s = 10 min`   | `1200 / 2` |
| `1920px`       | `960s = 16 min`   | `1920 / 2` |

**Die sichtbare Zeitspanne hängt NICHT von der Projektdauer ab!**

---

## 🎯 6. Auto-Fit Initial Zoom

### Beim Laden: Entire Timeline → Viewport

```typescript
// Lines 477-498
useEffect(() => {
  if (initialZoomSetRef.current || !viewportWidth || totalDurationSec <= 0)
    return;

  // Calculate pixels per second to fit entire timeline in viewport
  const pxFit = viewportWidth / totalDurationSec;

  // Clamp to valid range [MIN_PX_PER_SEC, MAX_PX_PER_SEC]
  const clamped = Math.min(MAX_PX_PER_SEC, Math.max(MIN_PX_PER_SEC, pxFit));

  // Convert to zoom value
  const z = zoomFromPxPerSec(clamped);

  setZoom(z);
  setPxPerSec(clamped);
  initialZoomSetRef.current = true;
}, [viewportWidth, totalDurationSec]);
```

### Formel

```
initialPxPerSec = viewportWidth / totalDurationSec
clampedPxPerSec = clamp(initialPxPerSec, MIN_PX_PER_SEC, MAX_PX_PER_SEC)
initialZoom = log(clampedPxPerSec / 2) / log(100)
```

### Beispiele

#### Beispiel 1: Kurzes Projekt

```
Projekt: 60s (1 Minute)
Viewport: 1200px

initialPxPerSec = 1200 / 60 = 20 px/s
clampedPxPerSec = clamp(20, 2, 200) = 20 px/s ✅
initialZoom = log(20/2) / log(100) = log(10) / log(100) = 0.5

→ Timeline passt perfekt in Viewport!
```

#### Beispiel 2: Langes Projekt

```
Projekt: 7200s (2 Stunden)
Viewport: 1200px

initialPxPerSec = 1200 / 7200 = 0.167 px/s
clampedPxPerSec = clamp(0.167, 2, 200) = 2 px/s ⚠️ (zu niedrig, auf MIN geklemmt)
initialZoom = log(2/2) / log(100) = 0.0

→ Timeline ist zu lang, zeigt nur Teil im Viewport (600s = 10min bei 1200px)
```

#### Beispiel 3: Sehr kurzes Projekt

```
Projekt: 3s (sehr kurz)
Viewport: 1200px

initialPxPerSec = 1200 / 3 = 400 px/s
clampedPxPerSec = clamp(400, 2, 200) = 200 px/s ⚠️ (zu hoch, auf MAX geklemmt)
initialZoom = log(200/2) / log(100) = log(100) / log(100) = 1.0

→ Maximum Zoom In, Timeline ist 3 × 200 = 600px breit (kleiner als Viewport)
```

---

## 🎯 7. Anchored Zoom (Zoom zur Cursor-Position)

### Feature

Beim Zoomen bleibt die **Zeit-Position unter dem Cursor fixiert**.

### Code

```typescript
// Lines 612-632
const setZoomAroundCursor = (newZoom: number, anchorX?: number) => {
  const el = scrollRef.current;
  if (!el || !viewportWidth) return;

  const oldPx = pxPerSec;
  const nextPx = pxPerSecFromZoom(newZoom);
  const cursorX = anchorX ?? viewportWidth / 2;

  // Calculate time unit under cursor
  const unitUnderCursor = (el.scrollLeft + cursorX) / oldPx;

  // Calculate new scroll position to keep same unit under cursor
  const newScrollLeft = unitUnderCursor * nextPx - cursorX;

  setZoom(newZoom);
  setPxPerSec(nextPx);

  requestAnimationFrame(() => {
    el.scrollLeft = newScrollLeft;
  });
};
```

### Formel

```
timeUnderCursor = (scrollLeft + cursorX) / oldPxPerSec
newScrollLeft = timeUnderCursor × newPxPerSec - cursorX
```

### Beispiel

```
Alte Einstellungen:
  scrollLeft = 1000px
  cursorX = 400px (Cursor-Position im Viewport)
  oldPxPerSec = 10 px/s

Zeit unter Cursor:
  timeUnderCursor = (1000 + 400) / 10 = 140s

Neuer Zoom:
  newPxPerSec = 20 px/s

Neue Scroll-Position:
  newScrollLeft = 140 × 20 - 400 = 2800 - 400 = 2400px

→ Zeit 140s bleibt unter Cursor fixiert!
```

---

## 🖱️ 8. Trackpad Zoom (Ctrl + Wheel)

```typescript
// Lines 640-652
const handleWheel = (e: React.WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const zoomDelta = -e.deltaY * 0.001;
    const newZoom = Math.max(0, Math.min(1, zoom + zoomDelta));

    const rect = viewportRef.current?.getBoundingClientRect();
    const cursorX = rect ? e.clientX - rect.left : viewportWidth / 2;

    setZoomAroundCursor(newZoom, cursorX);
  }
};
```

### Formel

```
zoomDelta = -wheelDeltaY × 0.001
newZoom = clamp(zoom + zoomDelta, 0.0, 1.0)
```

---

## 📐 9. Dynamische Tick-Berechnung

### Feature

Ruler-Ticks werden **dynamisch** berechnet, um Überlappungen zu vermeiden.

### Code

```typescript
// Lines 42-43
const MIN_LABEL_SPACING_PX = 80; // Minimum space between labels

// Lines 45-50
const TIME_STEPS_SECONDS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800,
];

// Lines 64-71
function chooseTickStep(pxPerSecond: number): number {
  const minSecondsBetweenTicks = MIN_LABEL_SPACING_PX / pxPerSecond;
  return (
    TIME_STEPS_SECONDS.find((step) => step >= minSecondsBetweenTicks) ??
    TIME_STEPS_SECONDS[TIME_STEPS_SECONDS.length - 1]
  );
}
```

### Formel

```
minSecondsBetweenTicks = MIN_LABEL_SPACING_PX / pxPerSec
tickStep = first(TIME_STEPS_SECONDS where step >= minSecondsBetweenTicks)
```

### Beispiele

| pxPerSec | minSecondsBetweenTicks | Chosen Tick Step | Beschreibung              |
| -------- | ---------------------- | ---------------- | ------------------------- |
| `2`      | `80 / 2 = 40s`         | `60s` (1 min)    | Zoom Out → große Schritte |
| `10`     | `80 / 10 = 8s`         | `10s`            | Middle                    |
| `20`     | `80 / 20 = 4s`         | `5s`             | Closer                    |
| `50`     | `80 / 50 = 1.6s`       | `2s`             | Zoom In                   |
| `100`    | `80 / 100 = 0.8s`      | `1s`             | Maximum Detail            |

---

## 📖 10. Buch-Timeline (Reading-Based Duration)

### Feature

Für **Buch-Projekte** wird die Dauer basierend auf **Lesegeschwindigkeit** berechnet.

### Formel

```
totalWords = sum of all words in all sections
readingSpeedWpm = words per minute (default: 150 WPM)

durationSeconds = (totalWords / readingSpeedWpm) × 60
durationMinutes = totalWords / readingSpeedWpm
```

### Beispiel

```
Buch: 60,000 Wörter
Lesegeschwindigkeit: 150 WPM

durationMinutes = 60,000 / 150 = 400 min = 6.67 Stunden
durationSeconds = 400 × 60 = 24,000 Sekunden

Bei pxPerSec = 2:
  timelineWidthPx = 24,000 × 2 = 48,000px
```

### Code-Referenzen

```typescript
// Lines 30, 35
duration?: number; // Total duration in SECONDS
readingSpeedWpm?: number; // Reading speed (default: 150 WPM)

// Lines 155-156
const totalDurationMin = duration / 60;
const totalDurationSec = duration;
```

---

## 🚀 11. Performance-Optimierungen

### 11.1 RAF Playhead (60fps)

```typescript
// Lines 524-550
useEffect(() => {
  const updatePlayheadPositions = () => {
    if (isPlayingRef.current) {
      // Smooth interpolation via delta time
      const elapsed =
        (performance.now() - rafPlaybackStartTimeRef.current) / 1000;
      displayTime = rafPlaybackStartCurrentTimeRef.current + elapsed;

      // Update playhead position at 60fps
      playheadRulerRef.current.style.left = `${displayTime * pxPerSecRef.current}px`;
    }
    smoothPlayheadRAF.current = requestAnimationFrame(updatePlayheadPositions);
  };

  smoothPlayheadRAF.current = requestAnimationFrame(updatePlayheadPositions);
  return () => cancelAnimationFrame(smoothPlayheadRAF.current);
}, []);
```

**Vorteil:** Playhead animiert mit **60fps**, unabhängig von React-Render-Rate!

### 11.2 Throttled State Updates

```typescript
// Line 548
if (performance.now() - lastStateUpdateTimeRef.current > 100) {
  setCurrentTime(displayTime);
  lastStateUpdateTimeRef.current = performance.now();
}
```

**Vorteil:** Maximal **10 State Updates pro Sekunde** → keine Render-Spam!

### 11.3 Viewport Culling

```typescript
// Line 502-503
const viewStartSec = scrollLeft / pxPerSec;
const viewEndSec = viewStartSec + (viewportWidth || 0) / pxPerSec;

// Only render items in visible range
const visibleItems = items.filter(
  (item) => item.endSec >= viewStartSec && item.startSec <= viewEndSec,
);
```

**Vorteil:** Rendert nur **sichtbare Items** → massiv schneller bei langen Timelines!

---

## 📊 12. Zusammenfassung

### Kern-Formeln

| Was                   | Formel                                                             |
| --------------------- | ------------------------------------------------------------------ |
| **Timeline Breite**   | `timelineWidthPx = durationSec × pxPerSec`                         |
| **pxPerSec von Zoom** | `pxPerSec = 2 × 100^zoom`                                          |
| **Zoom von pxPerSec** | `zoom = ln(pxPerSec / 2) / ln(100)`                                |
| **Sichtbare Zeit**    | `visibleSec = viewportWidth / pxPerSec`                            |
| **Initial Zoom**      | `initialPxPerSec = viewportWidth / durationSec` (clamped)          |
| **Anchored Zoom**     | `newScrollLeft = (scrollLeft + cursorX) / oldPx × newPx - cursorX` |
| **Tick Step**         | `tickStep = first(STEPS where step ≥ 80 / pxPerSec)`               |

### Zoom-Range

```
zoom = 0.0 → pxPerSec = 2 px/s   (Maximum Zoom Out)
zoom = 0.5 → pxPerSec = 20 px/s  (Middle)
zoom = 1.0 → pxPerSec = 200 px/s (Maximum Zoom In)

Faktor = 100x zwischen Min und Max!
```

### Datei-Referenzen

| Feature          | Lines   |
| ---------------- | ------- |
| Constants        | 38-50   |
| Zoom Functions   | 52-71   |
| State            | 125-133 |
| Timeline Width   | 501     |
| Anchored Zoom    | 612-632 |
| Trackpad Zoom    | 640-652 |
| Initial Auto-Fit | 477-498 |
| RAF Playhead     | 524-590 |

---

## 🎯 Design-Entscheidungen

### Warum Exponential Mapping?

✅ **Natürliches Gefühl** - mehr Präzision bei niedrigem Zoom
✅ **Industry Standard** - CapCut, Premiere, DaVinci verwenden ähnliche Systeme
✅ **Große Range** - 100x Zoom-Range (2-200 px/s)

### Warum Anchored Zoom?

✅ **Bessere UX** - User verliert nicht Kontext beim Zoomen
✅ **Intuitive** - Zoom "folgt" dem Cursor
✅ **Standard** - Alle modernen Video-Editoren nutzen es

### Warum Viewport Culling?

✅ **Performance** - nur sichtbare Items rendern
✅ **Skalierbar** - funktioniert mit 1000+ Timeline-Items
✅ **Smooth** - 60fps auch bei riesigen Projekten

---

**Erstellt:** 2024-11-23  
**Datei:** `/components/VideoEditorTimeline.tsx`  
**Status:** ✅ Vollständig dokumentiert
