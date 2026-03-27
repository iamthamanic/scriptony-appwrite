# Timeline Overhaul — Implementierungsplan

> Stand: 26. März 2026
> Alle Phasen bauen aufeinander auf. Phase 1 ist Voraussetzung für alles.

---

## DIE DREI KERNPROBLEME

### Problem A: Views sind nicht synchron
Jede View (FilmDropdown, VideoEditorTimeline, NativeScreenplayView) hat eine **eigene lokale Kopie** der Timeline-Daten. Änderungen in einer View spiegeln sich nicht sofort in der anderen. Beim Wechsel wird aus potenziell veralteten `initialData` neu initialisiert.

### Problem B: Shot-Bearbeitung erfordert View-Wechsel
Klick auf Shot in Timeline → wechselt zu Dropdown-View → klappt dort zum Shot auf. **Gewünscht:** Modal öffnet sich direkt in der Timeline mit vollem ShotCard-Inhalt, identisch wie im Dropdown.

### Problem C: Trim/Ripple Performance + fehlende Features
- `setBeats()` / `setManualActTimings()` bei jedem `mousemove` → React re-rendert 60×/Sek
- Kein Pointer Events + Pointer Capture
- Clip-Trim ist nur Roll, kein echtes Ripple
- Kein Undo/Redo

---

## PHASE 1: FOUNDATION — Shared State + ShotCard Modal
**Dauer: ~5h | Blockiert alles Weitere**

### 1.1 TimelineStateContext erstellen
**Neue Datei:** `src/contexts/TimelineStateContext.tsx`

React Context + `useReducer` (kein Zustand nötig — passt zum bestehenden Pattern).

```
State:
  acts: Act[]
  sequences: Sequence[]
  scenes: Scene[]
  shots: Shot[]

Actions:
  SET_TIMELINE_DATA     — initialer Load / Cache-Update
  UPDATE_ACT            — einzelnen Act ändern
  UPDATE_SEQUENCE       — einzelne Sequence ändern
  UPDATE_SCENE          — einzelne Scene ändern
  UPDATE_SHOT           — einzelnen Shot ändern
  DELETE_ACT/SEQ/SCENE/SHOT — mit optionalem Ripple
  ADD_ACT/SEQ/SCENE/SHOT    — einfügen
  BATCH_UPDATE          — mehrere Mutations auf einmal (für Trim)

Hooks:
  useTimelineState()     → { acts, sequences, scenes, shots, dispatch }
  useActById(id)         → memoized single Act
  useSceneShots(sceneId) → memoized shots for scene
```

**Warum Context statt Zustand:** Projekt nutzt bereits React-Patterns überall. Kein neues Dependency nötig. useReducer + Context reicht für die Datenmenge (max. ~100-200 Nodes).

### 1.2 ShotCardModal extrahieren
**Neue Datei:** `src/components/ShotCardModal.tsx`

Wrapper um die bestehende ShotCard-Logik. ShotCard selbst bleibt unverändert — das Modal stellt nur den Container (Dialog) bereit.

```tsx
Props:
  open: boolean
  onOpenChange: (open: boolean) => void
  shotId: string | null
  projectId: string

Intern:
  Liest Shot-Daten aus useTimelineState()
  Breadcrumb: Act > Sequence > Scene > Shot
  ShotCard mit allen Feldern (Kamera, Dialogue, Audio, Bild...)
  Save → dispatch UPDATE_SHOT → DB API Call
```

### 1.3 StructureBeatsSection als Provider
**Modify:** `src/components/StructureBeatsSection.tsx`

```tsx
// Vorher:
const [timelineData, setTimelineData] = useState(initialData);

// Nachher:
<TimelineStateProvider initialData={initialData} onDataChange={onDataChange}>
  {/* alle Views lesen jetzt aus Context */}
</TimelineStateProvider>
```

Alle drei Views (dropdown, timeline, native) lesen aus demselben Context. Änderung in einer View → sofort sichtbar in der anderen.

---

## PHASE 2: VIEW-SYNC + MODAL INTEGRATION
**Dauer: ~8h | Erfordert Phase 1**

### 2.1 FilmDropdown auf Shared State umstellen
**Modify:** `src/components/FilmDropdown.tsx`

- **Entfernen:** Lokaler State für `acts`, `sequences`, `scenes`, `shots`
- **Ersetzen:** `const { acts, sequences, scenes, shots, dispatch } = useTimelineState()`
- **Behalten:** View-spezifischer State (`expandedActs`, `expandedSequences`, `editingAct`, etc.)
- **Ersetzen:** Inline ShotCard → `setSelectedShotId(shot.id)` + `<ShotCardModal />`
- `expandShotId` Logik bleibt (Auto-Scroll zum Shot)

### 2.2 VideoEditorTimeline auf Shared State umstellen
**Modify:** `src/components/VideoEditorTimeline.tsx`

- Timeline-Daten aus Context statt `initialData` Prop
- **Ersetzen:** `onOpenShotInStructureTree(shotId)` → `setSelectedShotId(shotId)` + `<ShotCardModal />`
- Shot-Klick in Timeline öffnet jetzt Modal **direkt**, kein View-Wechsel mehr
- Beats bleiben eigener State (Beats-API ist separat von Timeline-Nodes)

### 2.3 BookDropdown analog umstellen
**Modify:** `src/components/BookDropdown.tsx`

Gleiche Logik wie FilmDropdown aber für Book-Hierarchie (Acts > Kapitel > Abschnitte).

### 2.4 Native Views live-fähig machen
**Modify:** `NativeScreenplayView.tsx`, `NativeBookView.tsx`, `NativeAudiobookView.tsx`

- `initialData` Prop → `useTimelineState()` Hook
- Rendern immer den aktuellen Stand, auch wenn in einem anderen View editiert wird

---

## PHASE 3: TRIM/RIPPLE PERFORMANCE
**Dauer: ~8h | Erfordert Phase 2**

### 3.1 Pointer Events + Pointer Capture
**Modify:** `src/components/VideoEditorTimeline.tsx`

Alle Trim-Handler von Mouse Events auf Pointer Events umstellen:

```
mousedown  → pointerdown + setPointerCapture(e.pointerId)
mousemove  → pointermove
mouseup    → pointerup + releasePointerCapture
window.addEventListener → Element-Level Listener (dank Capture)
```

Betrifft: Beat-Trim, Clip-Trim, Track-Resize.
Effekt: Touch/Pen funktioniert, Drag bricht nicht ab wenn Cursor Element verlässt.

### 3.2 Ephemeral Drag State (Refs statt setState)
**Neue Datei:** `src/lib/trim-drag-engine.ts`

```
TrimDragEngine:
  - startDrag(beatId, handle, clientX, pxPerSec, beats)
  - updateDrag(clientX) → berechnet newPct + rippleBeats, speichert in ref
  - commitDrag() → gibt finalen State zurück für dispatch
  - cancelDrag() → rollback

Rendering während Drag:
  - Beat-Positionen werden via CSS transform: translateX() aktualisiert
  - KEIN setBeats() während des Drags
  - Nur der getrimmte Beat + seine Ripple-Nachbarn werden per ref-basiertem rAF-Loop verschoben

Commit auf pointerup:
  - dispatch(BATCH_UPDATE) → Context-State + DB-Persist in einem Schritt
```

### 3.3 Beat-Trim Handler Refactor
**Modify:** `handleTrimMove` in `VideoEditorTimeline.tsx`

```
Vorher: mousemove → trimBeatLeft() → setBeats(prev => ...) [60 re-renders/sec]
Nachher: pointermove → trimDragEngine.updateDrag(e.clientX) → rAF: transform [0 re-renders/sec]
         pointerup  → trimDragEngine.commitDrag() → dispatch(BATCH_UPDATE) [1 re-render]
```

### 3.4 Clip-Trim Handler Refactor
**Modify:** `handleTrimClipMove` in `VideoEditorTimeline.tsx`

Gleiche Strategie: Ephemerer State während Drag, Commit auf pointerup.
Betrifft: `setManualActTimings()`, `setManualSequenceTimings()`, `setManualSceneTimings()`

### 3.5 Echtes Ripple für Clips implementieren
**Neue Datei:** `src/components/timeline-clip-ripple.ts`

```
Neuer Modus neben Roll:

  Roll (aktuell):  Grenze zwischen zwei Nachbarn verschieben → Gesamtdauer gleich
  Ripple (neu):    Clip kürzen/verlängern → alles downstream shiftet → Gesamtdauer ändert sich

Steuerung:
  - clipMagnets.act = true → Ripple aktiv (keine Lücken)
  - clipMagnets.act = false → Resize ohne Ripple (Lücken erlaubt)

Funktionen:
  trimClipRipple(clipId, newEndSec, allClips, trackType) → { updatedClips, newTotalDuration }
  trimClipRoll(clipId, newBoundarySec, prevClip, nextClip) → { updatedPrev, updatedNext }
```

---

## PHASE 4: UNDO/REDO
**Dauer: ~4h | Erfordert Phase 1, parallel zu Phase 2-3 möglich**

### 4.1 History Manager in Context einbauen
**Modify:** `src/contexts/TimelineStateContext.tsx`

```
Zusätzlich zum Reducer:
  historyStack: State[]      (max 50 Einträge)
  historyIndex: number

  dispatch(UNDO) → historyIndex - 1 → restore state
  dispatch(REDO) → historyIndex + 1 → restore state

  Jede Mutation (außer SET_TIMELINE_DATA) pushed auf den Stack.

Hook:
  useTimelineUndo() → { undo, redo, canUndo, canRedo }
```

### 4.2 Keyboard Shortcuts
**Modify:** `src/components/StructureBeatsSection.tsx`

```
useEffect:
  Cmd+Z / Ctrl+Z → dispatch(UNDO)
  Cmd+Shift+Z / Ctrl+Y → dispatch(REDO)

Toast-Feedback: "Rückgängig: Act 2 bearbeitet" etc.
```

### 4.3 Undo-Buttons in UI
Optional: Undo/Redo Buttons in Timeline-Toolbar und Dropdown-Header.

---

## PHASE 5: TRACK-LINKAGE & LOCKING (OPTIONAL)
**Dauer: ~5h | Erfordert Phase 3**

### 5.1 Track-Datenmodell erweitern
```
Track: { id, type, locked: boolean, rippleSync: boolean }
Clip:  { ...existing, groupId?: string, linkedTo?: string[] }
```

### 5.2 Lock-Toggle pro Track in Timeline UI
Lock-Icon im Track-Header. Gesperrte Tracks werden bei Ripple-Operationen ignoriert.

### 5.3 Linkage-Logik bei Ripple
Wenn Main-Track-Clip gerippled wird → verlinkte Clips auf anderen Tracks folgen mit gleicher Delta-Verschiebung (außer Track ist locked).

---

## ZUSAMMENFASSUNG: PRIORITÄTEN

```
PHASE 1  ━━━━━━━━━━━━━━━━━━━━━━━  MUST (Foundation)
  1.1 TimelineStateContext         ← Single Source of Truth
  1.2 ShotCardModal                ← Shot-Bearbeitung überall
  1.3 StructureBeatsSection Provider

PHASE 2  ━━━━━━━━━━━━━━━━━━━━━━━  MUST (View Sync)
  2.1 FilmDropdown → Context       ← Dropdown liest/schreibt zentral
  2.2 VideoEditorTimeline → Context ← Timeline liest/schreibt zentral
  2.3 BookDropdown → Context        ← Buch-View analog
  2.4 Native Views → Context        ← Screenplay/Book/Audio live

PHASE 3  ━━━━━━━━━━━━━━━━━━━━━━━  MUST (Smoothness)
  3.1 Pointer Events + Capture     ← Touch + stabiler Drag
  3.2 Ephemeral Drag State         ← 60fps statt Ruckeln
  3.3 Beat-Trim Refactor           ← Refs + rAF
  3.4 Clip-Trim Refactor           ← Refs + rAF
  3.5 Echtes Clip-Ripple           ← CapCut-Feeling

PHASE 4  ━━━━━━━━━━━━━━━━━━━━━━━  SHOULD (UX)
  4.1 History Manager              ← Undo-Stack im Context
  4.2 Keyboard Shortcuts           ← Cmd+Z / Ctrl+Z
  4.3 UI Buttons                   ← Optional

PHASE 5  ━━━━━━━━━━━━━━━━━━━━━━━  NICE-TO-HAVE (Pro)
  5.1 Track Lock/Sync              ← Schutz vor Mitrippeln
  5.2 Cross-Track Linkage          ← Gruppen folgen gemeinsam
```

---

## ABHÄNGIGKEITEN

```
Phase 1 ──→ Phase 2 ──→ Phase 3
  │                         │
  └──→ Phase 4 ←────────────┘
                              │
                              └──→ Phase 5
```

Phase 4 (Undo) kann parallel zu Phase 2/3 laufen, braucht aber Phase 1 als Basis.

---

## GESCHÄTZTER AUFWAND

| Phase | Beschreibung | Geschätzt |
|-------|-------------|-----------|
| 1 | Foundation: Context + Modal | ~5h |
| 2 | View Sync + Integration | ~8h |
| 3 | Trim Performance + Ripple | ~8h |
| 4 | Undo/Redo | ~4h |
| 5 | Track Linkage (optional) | ~5h |
| **Gesamt (ohne Phase 5)** | | **~25h** |
| **Gesamt (mit Phase 5)** | | **~30h** |

---

## BETROFFENE DATEIEN

### Neu zu erstellen:
- `src/contexts/TimelineStateContext.tsx` — Shared State mit Reducer
- `src/components/ShotCardModal.tsx` — Modal-Wrapper für ShotCard
- `src/lib/trim-drag-engine.ts` — Ephemerer Drag-State Manager
- `src/components/timeline-clip-ripple.ts` — Ripple-Funktionen für Clips

### Zu modifizieren:
- `src/components/StructureBeatsSection.tsx` — Provider-Wrapper
- `src/components/FilmDropdown.tsx` — Local State → Context, Modal statt Inline-ShotCard
- `src/components/VideoEditorTimeline.tsx` — Context, Pointer Events, Ephemerer Drag, Modal
- `src/components/BookDropdown.tsx` — Local State → Context
- `src/components/NativeScreenplayView.tsx` — initialData → Context
- `src/components/NativeBookView.tsx` — initialData → Context
- `src/components/NativeAudiobookView.tsx` — initialData → Context
- `src/components/timeline-helpers.ts` — Eventuell Refactor für Drag-Engine Integration
- `src/components/timeline-blocks.ts` — Context-kompatible Inputs

### Unverändert:
- `src/components/ShotCard.tsx` — Bleibt wie es ist (Modal ist nur Wrapper)
- `src/lib/api/timeline-api.ts` — API bleibt gleich
- `src/lib/api/timeline-api-v2.ts` — API bleibt gleich
- `src/lib/api/beats-api.ts` — API bleibt gleich
- `src/hooks/useBeats.ts` — Beats-Hooks bleiben (separate Domäne)
