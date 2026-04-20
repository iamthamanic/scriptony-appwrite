# 🎬 Timeline Zoom - Visuelle Darstellung

## 📊 Exponential Zoom Curve

```
pxPerSec
   ↑
200│                                        ●  (zoom = 1.0)
   │                                    ╱
   │                                ╱
   │                            ╱
   │                        ╱
100│                    ╱
   │                ╱
   │            ╱
   │        ╱
 50│    ╱
   │╱● (zoom = 0.5, pxPerSec = 20)
   │╱
 20│
   │
 10│
   │
  2│●──────────────────────────────────────→ zoom
   0.0    0.2    0.4    0.6    0.8    1.0

Formula: pxPerSec = 2 × 100^zoom
```

---

## 🎚️ Slider Mapping

```
Slider Value:  0.0      0.25      0.5      0.75      1.0
               │         │         │         │         │
               ▼         ▼         ▼         ▼         ▼
pxPerSec:      2        ~5.6      20       ~63       200
               │         │         │         │         │
               ▼         ▼         ▼         ▼         ▼
Description:   Max      Quarter   Middle   3/4       Max
               Zoom                                   Zoom
               Out                                    In
```

---

## 📐 Timeline Width Examples

### Example 1: 10-Minute Film

```
Duration: 600 seconds (10 min)

Zoom = 0.0 (pxPerSec = 2):
├──────────────────────────────────────────────────────┤
0s                                                  600s
Timeline Width: 600 × 2 = 1,200px


Zoom = 0.5 (pxPerSec = 20):
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
0s                                                                                                                  600s
Timeline Width: 600 × 20 = 12,000px


Zoom = 1.0 (pxPerSec = 200):
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
0s                                                                                                                                                                                                                                                                                                  600s
Timeline Width: 600 × 200 = 120,000px
```

---

## 🔍 Viewport Visibility

```
                    ┌──────────────────────┐
                    │   VIEWPORT (1200px)  │
                    └──────────────────────┘

Zoom = 0.0 (pxPerSec = 2):
Visible Duration = 1200 / 2 = 600s = 10 min

├──────────────────────────────────────────────────────┤
│████████████████VIEWPORT█████████████████│            │
0s                   600s                           1800s
│◄───── Visible ────►│
    600 seconds


Zoom = 0.5 (pxPerSec = 20):
Visible Duration = 1200 / 20 = 60s = 1 min

├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│████VIEWPORT████│                                                                                                     │
0s    60s                                                                                                          600s
│◄─ Visible ─►│
  60 seconds


Zoom = 1.0 (pxPerSec = 200):
Visible Duration = 1200 / 200 = 6s

├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│█VIEWPORT█│                                                                                                                                                                                                                                                                                           │
0s 6s                                                                                                                                                                                                                                                                                             600s
│◄Visible►│
  6 seconds
```

---

## 🎯 Anchored Zoom Behavior

### Before Zoom (pxPerSec = 10)

```
┌────────────────────VIEWPORT (1200px)────────────────┐
│                           ▲                          │
│                        Cursor                        │
│                      (x = 400px)                     │
├──────────────────────────┼───────────────────────────┤
0s                        140s                       260s
│◄──────1000px────────►│◄400px►│

scrollLeft = 1000px
timeUnderCursor = (1000 + 400) / 10 = 140s
```

### After Zoom (pxPerSec = 20)

```
┌────────────────────VIEWPORT (1200px)────────────────┐
│                           ▲                          │
│                        Cursor                        │
│                      (x = 400px)                     │
├──────────────────────────┼───────────────────────────┤
120s                      140s                       180s
│◄──────2400px────────►│◄400px►│

newScrollLeft = 140 × 20 - 400 = 2400px
timeUnderCursor = (2400 + 400) / 20 = 140s ✅ SAME!
```

**Result:** Time 140s stays under cursor! 🎯

---

## 📏 Dynamic Tick Spacing

### Zoom Out (pxPerSec = 2)

```
Timeline:
├────────┬────────┬────────┬────────┬────────┬────────┤
0min    1min    2min    3min    4min    5min    6min

Tick Step = 60s (1 minute)
minSpacing = 80px
actualSpacing = 60s × 2 = 120px ✅
```

### Medium Zoom (pxPerSec = 10)

```
Timeline:
├──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┤
0s 10s 20s 30s 40s 50s 60s 70s 80s 90s 100s110s120s...

Tick Step = 10s
minSpacing = 80px
actualSpacing = 10s × 10 = 100px ✅
```

### Zoom In (pxPerSec = 50)

```
Timeline:
├─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┤
0s 1s 2s 3s 4s 5s 6s 7s 8s 9s 10s11s12s13s14s15s16s...

Tick Step = 1s
minSpacing = 80px
actualSpacing = 1s × 50 = 50px ⚠️ (but clamped by font size)
```

---

## 🎬 Timeline Tracks Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ RULER: Time Markers (Fixed Height)                              │
├─────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────┤
│ 0s  │ 10s  │ 20s  │ 30s  │ 40s  │ 50s  │ 60s  │ 70s  │ 80s ... │
└─────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴─────────┘
┌─────────────────────────────────────────────────────────────────┐
│ BEATS TRACK (Resizable: 40-120px)                               │
│ ┌─────────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│ │ Opening Image   │  │ Inciting     │  │ Midpoint          │  │
│ └─────────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ ACT 1 TRACK (Resizable: 40-100px)                               │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Act 1: Setup                                              │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ SEQUENCE TRACK (Resizable: 40-80px)                             │
│ ┌─────────────┐  ┌──────────────┐  ┌─────────────┐            │
│ │ Seq 1       │  │ Seq 2        │  │ Seq 3       │            │
│ └─────────────┘  └──────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ SCENE TRACK (Resizable: 60-150px)                               │
│ ┌────┐┌────┐┌────┐┌───────┐┌─────┐┌────┐┌───────┐            │
│ │Sc1 ││Sc2 ││Sc3 ││ Sc 4  ││Sc 5 ││Sc6 ││ Sc 7  │            │
│ └────┘└────┘└────┘└───────┘└─────┘└────┘└───────┘            │
└─────────────────────────────────────────────────────────────────┘

Each track height can be resized independently!
Height is saved in localStorage per track type.
```

---

## 🚀 Performance: RAF Playhead Animation

### React State Updates (Slow)

```
Time:    0s ──── 1s ──── 2s ──── 3s ──── 4s ──── 5s
         │       │       │       │       │       │
Renders: ●───────●───────●───────●───────●───────●
         └───────┴───────┴───────┴───────┴───────┘
         ~5-10 renders/sec (slow, choppy)
```

### RAF Loop (Fast, 60fps!)

```
Time:    0s ──── 1s ──── 2s ──── 3s ──── 4s ──── 5s
         │││││││││││││││││││││││││││││││││││││││││
RAF:     ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●
         └───────────────────────────────────────┘
         60 updates/sec (smooth!)
```

**Result:** Playhead moves smoothly at 60fps, independent of React render rate! ✨

---

## 📖 Book Timeline Special Behavior

### Film Timeline (Duration = Fixed)

```
Film Duration: 120 minutes (fixed by film length)

├────────────────────────────────────────────────────┤
0min                                            120min
│◄──────────────── 7200 seconds ─────────────────►│
```

### Book Timeline (Duration = Dynamic)

```
Book: 30,000 words
Reading Speed: 150 WPM

Duration = 30,000 / 150 = 200 minutes (dynamic!)

├────────────────────────────────────────────────────┤
0min                                            200min
│◄──────────────── 12,000 seconds ────────────────►│

If user adds more text:
  New: 40,000 words
  Duration = 40,000 / 150 = 267 minutes

  Timeline automatically extends! 🔄
```

**Key Difference:**

- Film: Duration is **input** (fixed)
- Book: Duration is **calculated** from content (dynamic)

---

## 🎯 Auto-Fit Behavior Examples

### Example 1: Short Project (Fits in Viewport)

```
Project: 60s (1 minute)
Viewport: 1200px

Calculation:
  idealPxPerSec = 1200 / 60 = 20 px/s
  clampedPxPerSec = clamp(20, 2, 200) = 20 ✅
  initialZoom = log(20/2) / log(100) = 0.5

Result:
┌─────────────────────VIEWPORT (1200px)───────────────────────┐
│ ┌──────────────────────────────────────────────────────┐   │
│ │              TIMELINE (1200px)                       │   │
│ └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
0s                                                          60s

✅ Perfect fit!
```

### Example 2: Long Project (Doesn't fit)

```
Project: 3600s (1 hour)
Viewport: 1200px

Calculation:
  idealPxPerSec = 1200 / 3600 = 0.33 px/s
  clampedPxPerSec = clamp(0.33, 2, 200) = 2 ⚠️ (too low)
  initialZoom = log(2/2) / log(100) = 0.0

Result:
┌─────────VIEWPORT (1200px)────────┐
│ ┌─────────────────────────────────────────────────────────────┐
│ │          TIMELINE (7200px)                                  ...
│ └─────────────────────────────────────────────────────────────┘
└───────────────────────────────────┘
0s              600s                                        3600s
│◄── Visible ──►│

⚠️ Only 600s visible (10 minutes), need to scroll for rest
```

### Example 3: Very Short Project (Max Zoom)

```
Project: 3s (very short)
Viewport: 1200px

Calculation:
  idealPxPerSec = 1200 / 3 = 400 px/s
  clampedPxPerSec = clamp(400, 2, 200) = 200 ⚠️ (too high)
  initialZoom = log(200/2) / log(100) = 1.0

Result:
┌─────────────────────VIEWPORT (1200px)───────────────────────┐
│    ┌────────────┐                                           │
│    │ TIMELINE   │                                           │
│    │  (600px)   │                                           │
│    └────────────┘                                           │
└──────────────────────────────────────────────────────────────┘
     0s        3s

⚠️ Timeline is smaller than viewport (max zoom reached)
```

---

## 🎛️ Zoom Controls

### Slider

```
┌─────────────────────────────────────────────────────┐
│  Zoom:  ├───●───────────────────────────┤  50%      │
│         0.0                            1.0          │
│                                                      │
│         👈 Zoom Out          Zoom In 👉             │
└─────────────────────────────────────────────────────┘

Value: 0.0 - 1.0
Current: 0.5 → 20 px/s
```

### Trackpad Gesture

```
Ctrl + Scroll Down ═══► Zoom Out
Ctrl + Scroll Up   ═══► Zoom In

Anchored to cursor position! 🎯
```

### Keyboard (Potential)

```
Cmd/Ctrl + Plus  (+)  ═══► Zoom In
Cmd/Ctrl + Minus (-)  ═══► Zoom Out
Cmd/Ctrl + 0          ═══► Reset to Auto-Fit
```

---

## 📊 Memory & Performance

### Viewport Culling Visualization

```
Full Timeline (1000 items):
├─────────────────────────────────────────────────────────────┤
│ 1  2  3  4  5  6  7  8  9  10 ... 990 991 992 ... 1000     │
└─────────────────────────────────────────────────────────────┘

        ┌───────VIEWPORT──────┐
        │   Only render:      │
        │   Items 45-60       │
        │   (16 items)        │
        └─────────────────────┘

DOM Elements: 16 (not 1000!) 🚀
Render Time: 5ms (not 500ms!)
```

---

**Erstellt:** 2024-11-23  
**Visualisierungen:** ASCII Art  
**Basiert auf:** `/components/VideoEditorTimeline.tsx`
