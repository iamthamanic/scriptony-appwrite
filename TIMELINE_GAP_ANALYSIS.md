# Timeline Gap-Analyse: IST vs. SOLL (Research Report)

> Stand: 26. März 2026
> Quellen: `deep-research-report.md` (CapCut/NLE-Recherche) + Code-Review aller Timeline-Dateien

---

## 1. TRIMMING & RIPPLE

### 1a) Beat Ripple-Trim ✅ VORHANDEN

| Aspekt | IST (Code) | SOLL (Report) | Status |
|--------|-----------|---------------|--------|
| Left-Handle → Previous Beats schieben gapless nach | `trimBeatLeft()` in `timeline-helpers.ts` — Beats upstream behalten eigene Dauer, werden an den neuen Start angeklebt | Ripple: "Kante ändern, downstream verschieben, Lücke schließen" | ✅ Match |
| Right-Handle → Folgende Beats shiften nach | `trimBeatRight()` — Beats downstream starten genau wo der getrimmte Beat endet | Ripple-Semantik | ✅ Match |
| Min-Duration Clamp | `MIN_BEAT_DURATION_SEC = 1` | Erwähnt als `minDuration` im Datenmodell | ✅ Match |

### 1b) Clip-Trim (Acts/Sequences/Scenes/Shots) ⚠️ ABWEICHUNG

| Aspekt | IST (Code) | SOLL (Report) | Status |
|--------|-----------|---------------|--------|
| Innere Grenze zwischen zwei Nachbarn verschieben | `handleTrimClipMove()` — Roll-Semantik: `[prevId].pct_to = newPct`, `[curId].pct_from = newPct` → Gesamtdauer bleibt gleich | Report: "Roll = Schnittpunkt verschieben, Gesamtdauer gleich" — das IST Roll, kein Ripple | ⚠️ Falsch benannt im Code (heißt "Trim" ist aber Roll) |
| Äußere Kante (erstes/letztes Element) | `trimFirstLeft` / `trimLastRight` — Proportionales Redistribuieren der anderen Elemente via `redistributeShotLensProportional()` | Report: Ripple = "Kante kürzen/verlängern, downstream alles shiften, **Gesamtdauer ändert sich**" | ❌ **FEHLT**: Kein echtes Ripple für Clips. Gesamtdauer bleibt immer gleich, stattdessen wird umverteilt |
| Clips dürfen bewusst Lücken haben (Magnet aus) | Clip-Trim hat kein "Lücke bleibt stehen"-Verhalten. Alles ist immer dicht, unabhängig vom Magnet-Toggle | Report: "Magnet aus → Gap bleibt stehen" als Akzeptanzkriterium | ❌ **FEHLT** |

### 1c) Ripple Delete ⚠️ TEILWEISE

| Aspekt | IST | SOLL | Status |
|--------|-----|------|--------|
| Beat löschen + Gap schließen | `handleDeleteBeat()` — `beatMagnetEnabled ? shift downstream : einfach löschen` | "Ripple Delete: Entfernen + Gap schließen" | ✅ Für Beats |
| Clip löschen + Ripple | Nicht vorhanden für Acts/Sequences/Scenes | "Delete auf Main Track = Ripple Delete" | ❌ **FEHLT** für Clip-Track |

---

## 2. MAGNET vs. SNAPPING

### 2a) Snapping ✅ VORHANDEN

| Aspekt | IST | SOLL | Status |
|--------|-----|------|--------|
| Pixel-basierter Threshold | `SNAP_THRESHOLD_PX = 8` → `thresholdSec = 8 / pxPerSec` (konsistent bei allen Zoom-Levels) | "Wenn |tCandidate - tTarget| < threshold, setze t = tTarget" | ✅ Match |
| Snap-Targets: Beat-Kanten | `snapTime()` sammelt alle `pct_from`/`pct_to`-Kanten | Clip-Kanten als Snap-Target | ✅ |
| Snap-Target: Playhead | `snapToPlayheadSec` als Option | "Playhead als Snap-Target" | ✅ |
| Clip-Kanten als Snap-Targets | `collectClipSnapEdgesFilm()` sammelt Act/Seq/Scene/Shot-Kanten | Multi-Track-Kanten als Snap-Ziele | ✅ |

### 2b) Magnet (Zusammenhalt/Gap-Vermeidung) ⚠️ GEMISCHT

| Aspekt | IST | SOLL | Status |
|--------|-----|------|--------|
| Beat Magnet Toggle | `beatMagnetEnabled` State → steuert ob Ripple bei Trim aktiv ist | "Main Track Magnet = strukturelle Regel" | ✅ |
| Clip Magnets pro Track | `clipMagnets.act/.sequence/.scene/.shot` in localStorage | CapCut: Main Track Magnet als ein Toggle | ⚠️ Funktional ok, aber CapCut hat einen globalen Main-Track-Magnet, nicht pro Sub-Track |
| Magnet aus = Lücke erlaubt | Beat Magnet aus → kein Ripple, aber auch kein Gap-Objekt. Clips: Magnet steuert nur Snapping, nicht ob Lücken entstehen dürfen | "Magnet aus → Gap bleibt stehen (klassisches resize without ripple)" | ❌ Clip-Trim erzeugt nie Lücken, egal ob Magnet an/aus |

### 2c) Trennung Magnet ↔ Snapping ⚠️ VERMISCHT

| Aspekt | IST | SOLL | Status |
|--------|-----|------|--------|
| Separate Toggles in UI | Beat: ein Toggle der beides steuert. Clips: `clipMagnets` togglen Snapping, nicht Ripple | CapCut: "Main Track Magnet" (strukturell) + "Auto Snapping" (Interaktionshilfe) als getrennte Toggles | ⚠️ Die Trennung ist konzeptionell nicht sauber durchgezogen |

---

## 3. MULTI-TRACK, LINKAGE, LOCKING

| Aspekt | IST | SOLL | Status |
|--------|-----|------|--------|
| Track-Hierarchie | Spuren: Beats → Acts → Sequences → Scenes → Shots → Musik → SFX | CapCut: Main Track + Nebenspuren | ✅ Struktur vorhanden |
| Linkage (`linkedTo`, `groupId`) | **Nicht vorhanden**. Keine Verknüpfung zwischen Clips über Tracks hinweg | "Linkage: gekoppelte Elemente folgen dem Haupt-Clip mit gleicher Delta-Verschiebung" | ❌ **FEHLT** |
| Track Lock (`locked: boolean`) | **Nicht vorhanden** | "Tracks sperren, um bei Ripple nicht mitzushiften" | ❌ **FEHLT** |
| Sync-Lock (Premiere-Style) | **Nicht vorhanden** | "rippleSync: true → Track folgt bei Main-Track-Ripple" | ❌ **FEHLT** |
| Cross-Track-Ripple | Jeder Track operiert komplett isoliert | "Main Track ripplet, linked Tracks folgen, locked Tracks bleiben" | ❌ **FEHLT** |

---

## 4. DATENMODELL

| Aspekt | IST | SOLL | Status |
|--------|-----|------|--------|
| Beat-Positionen | `pct_from` / `pct_to` (0–100%) relativ zu Gesamt-Duration | "Variante B: kumulative Sequenz, start als Prefix-Sum" — passt konzeptionell (%-basiert = relativ zur Dauer) | ✅ Funktional äquivalent |
| Clip-Positionen (Film) | `pct_from` / `pct_to` in Metadata, relativ zum Eltern-Container (Act→innerhalb Projekt, Seq→innerhalb Act, Scene→innerhalb Seq) | "Variante A: absolute start/duration pro Clip" | ⚠️ Geschachtelte %-Werte statt absoluter Zeiten — funktional ok, aber komplexer bei Cross-Track-Operationen |
| Gap-Clips | **Nicht vorhanden**. Lücken existieren nicht als Objekte | "Gap-Clips als eigener Clip-Typ (FCP-Konzept): explizite Kontrolle über absichtliche Lücken" | ❌ **FEHLT** |
| Track-Metadaten | Kein Track-Objekt mit `locked`/`rippleSync` | `Track: { id, type, locked, rippleSync }` | ❌ **FEHLT** |

---

## 5. INPUT-HANDLING & PERFORMANCE

### 5a) Pointer Events ❌ FEHLT

| Aspekt | IST | SOLL | Status |
|--------|-----|------|--------|
| Event-Typ | `mousedown` / `mousemove` / `mouseup` überall | "Pointer Events (pointerdown/move/up) für Mouse + Touch + Pen" | ❌ Kein Touch/Pen-Support |
| Pointer Capture | **Nicht vorhanden** | `setPointerCapture()` damit Drag nicht abbricht wenn Cursor das Handle verlässt | ❌ **FEHLT** — Drag bricht ab wenn Cursor aus dem Element rutscht (da `window`-Level-Listener das teilweise kompensieren, funktioniert es *meistens*) |

### 5b) Drag State Management ❌ KRITISCH

| Aspekt | IST | SOLL | Status |
|--------|-----|------|--------|
| **Beat-Trim während Drag** | `setBeats()` bei **jedem mousemove** → React State-Update → Re-Render | "Ephemeral Drag State in rAF-Loop, committed State nur auf pointerup" | ❌ **Re-Render pro Frame** — Smoothness-Killer |
| **Clip-Trim während Drag** | `setManualActTimings()` / `setManualSequenceTimings()` / `setManualSceneTimings()` bei jedem mousemove | Gleiche Empfehlung: Refs + rAF für ephemeren State | ❌ **Re-Render pro Frame** |
| Commit auf mouseup | ✅ Beat-Trim: DB-Persist auf `handleTrimEnd`. ✅ Clip-Trim: DB-Persist auf `handleTrimClipEnd` mit Snapshot-Revert bei Fehler | "Committed Timeline State nur auf pointerup persistieren" | ✅ DB-Persist korrekt getrennt — aber **UI-State** sollte auch erst auf mouseup committed werden |

### 5c) Layout & Rendering ⚠️ VERBESSERBAR

| Aspekt | IST | SOLL | Status |
|--------|-----|------|--------|
| Block-Positionierung | `x` und `width` als berechnete Pixel-Werte → als `style={{ left: x, width }}` | "Während Drag: `transform: translateX(...)`, nicht left/width" | ⚠️ Funktioniert, aber Layout-Thrashing bei vielen Blöcken |
| Playhead-Rendering | ✅ `requestAnimationFrame` + `transform: translateX()` via Refs — kein React-Re-Render | "rAF + transform für flüssige Animation" | ✅ Perfekt umgesetzt |
| Viewport Culling | ✅ `visible: endSec >= viewStartSec && startSec <= viewEndSec` | "Nur sichtbare Clips rendern" | ✅ |
| `useLayoutEffect` für Messungen | **Nicht verwendet** in VideoEditorTimeline | "useLayoutEffect vor Browser-Repaint für Messungen" | ⚠️ Kein akutes Problem, aber bei Track-Height-Messungen empfohlen |
| Canvas-Rendering | **Nicht vorhanden** — alles DOM-basiert | "Bei Hunderten/Tausenden Segmenten: Canvas (react-konva) oder Virtualisierung" | ⚠️ Erst relevant bei sehr vielen Blöcken (Groupwriting-Szenarien) |

---

## 6. UNDO/REDO

| Aspekt | IST | SOLL | Status |
|--------|-----|------|--------|
| Undo für Beat-Trim | `beatTrimSnapshotRef` speichert Zustand vor Drag → Revert bei DB-Fehler | "Committed State auf pointerup = ein Undo-Step" | ⚠️ Revert bei Fehler ja, aber **kein User-Undo** (Ctrl+Z) |
| Undo für Clip-Trim | `trimClipSnapshotRef` speichert manualTimings → Revert bei DB-Fehler | Gleich | ⚠️ Kein User-Undo |
| Generisches Undo/Redo-System | **Nicht vorhanden** | Explizit empfohlen als Soll-Zustand | ❌ **FEHLT** |

---

## 7. ZOOM & LINEAL

| Aspekt | IST | SOLL | Status |
|--------|-----|------|--------|
| Fit-to-View (Zoom=0) | `getFitPxPerSec()` → gesamte Timeline sichtbar | CapCut: Zoom ganz raus = alles sichtbar | ✅ |
| Exponentieller Zoom | `pxPerSecFromZoom()` — `minPx * Math.pow(ratio, zoom)` | Nicht explizit im Report, aber Standard für NLE-Feeling | ✅ |
| Cursor-Anchor-Zoom | Implementiert (Zoom zentriert sich auf Cursor-Position) | Standard in CapCut/Resolve | ✅ |
| Adaptive Tick-Steps | `chooseTickStep()` — dynamische Tick-Abstände je nach Zoom | Keine Überlappungen bei Zoom-Labels | ✅ |
| Dual-Mode (Film + Buch) | Sekunden-basiert (Film) + Wort/Seiten-basiert (Buch) mit `readingSpeedWpm`-Konvertierung | Spezifisch für Scriptony, nicht im Report | ✅ Eigenleistung |

---

## KORREKTUREN ZUR VORHERIGEN TABELLE

Die vorherige Gegenüberstellung war im Wesentlichen korrekt. Drei Punkte waren **unpräzise oder fehlten**:

1. **"Ripple Delete nicht explizit beschrieben"** — FALSCH. `handleDeleteBeat()` ist explizit implementiert mit vollem Ripple (shift downstream wenn Magnet aktiv). War in der Tabelle als "nicht explizit als eine Ripple-Delete-Operation beschrieben" markiert — das stimmt nicht, es IST explizit drin und funktioniert korrekt.

2. **Clip-Trim ist KEIN Ripple sondern Roll** — Die vorherige Tabelle sagt "Clips: Trim + Nachbarn/Container-Logik, First/Last mit proportionaler Verteilung" — das ist technisch korrekt, aber verschleiert den entscheidenden Punkt: Für innere Grenzen ist es **Roll-Semantik** (Report-Terminologie), nicht Ripple. Und für äußere Kanten ist es **Redistribution** (Gesamtdauer bleibt gleich), was weder Ripple noch Roll ist. Der Report fordert explizit: "Ripple = Gesamtdauer ändert sich". Das passiert bei Clips nie.

3. **Sequentielles DB-Update bei Ripple Delete** — `handleDeleteBeat` macht `for (const beat of beatsToUpdate) { await BeatsAPI.updateBeat(...) }` — bei vielen Beats ist das eine Kaskade von sequentiellen API-Calls. Sollte ein Batch-Update sein (die `beats-api.ts` hat batch-fähige Endpoints).

---

## PRIORISIERTE HANDLUNGSEMPFEHLUNG

### MUSS (Smoothness + CapCut-Feeling)

| # | Was | Warum | Aufwand |
|---|-----|-------|---------|
| 1 | **Ephemeral Drag State** (Refs + rAF statt setState bei jedem mousemove) | Jeder mousemove triggert React-Reconciliation. Bei 60fps = 60 State-Updates/Sekunde = Ruckeln bei vielen Blöcken | Mittel — Refactor handleTrimMove + handleTrimClipMove |
| 2 | **Pointer Events + Pointer Capture** | Touch funktioniert nicht, Drag kann fragil sein | Klein — mousedown→pointerdown, setPointerCapture hinzufügen |
| 3 | **Echtes Ripple für Clips** (Gesamtdauer ändert sich) | Ohne das ist Clip-Trim nur Roll — kein CapCut-Feeling | Mittel — neuer Modus neben Roll |

### SOLL (Robustes NLE-Modell)

| # | Was | Warum | Aufwand |
|---|-----|-------|---------|
| 4 | **Undo/Redo** | Grundlegende UX-Erwartung bei destruktiven Operationen | Mittel — Command-Pattern oder State-History |
| 5 | **Magnet-Toggle = Ripple an/aus** (nicht nur Snapping) | Aktuell steuert Clip-Magnet nur Snapping, nicht ob Lücken entstehen dürfen | Klein — semantische Klarstellung |
| 6 | **Gap-Clips** als explizite Objekte | Ermöglicht "Magnet aus → Lücke bleibt" sauber | Mittel — Datenmodell-Erweiterung |

### KANN (Pro-Features)

| # | Was | Warum | Aufwand |
|---|-----|-------|---------|
| 7 | Linkage zwischen Tracks | Clips über Spuren hinweg verbinden | Groß |
| 8 | Track Lock/Sync-Lock | Schutz vor ungewolltem Mitrippeln | Mittel |
| 9 | Canvas-Rendering für Skalierung | DOM wird bei Hunderten Blöcken teuer | Groß — Architektur-Wechsel |
| 10 | `transform`-basiertes Drag-Rendering | Weniger Layout-Thrashing | Klein |
