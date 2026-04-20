# SCRIPTONY Performance-Optimierungsplan

## Timeline & Dropdown Loading — McMaster-Carr-Strategie

**Ziel:** Initiale Ladezeit von ~3–5s auf <500ms
**Datum:** April 2026

---

## Executive Summary

Die Analyse des Scriptony-Frontends zeigt, dass die langsamen Ladezeiten von Timeline und Dropdown auf drei Kernprobleme zurückzuführen sind: ein doppelter Ladepfad, das vollständige Vorladen aller Shots und fehlende Content-Exklusion. Dieser Plan beschreibt 10 konkrete Optimierungsschritte in 4 Phasen.

> **Wichtigste Erkenntnis:** Viel Optimierungs-Code existiert bereits im Codebase (`useLazyLoadShots`, `useOptimizedFilmDropdown`, `OptimizedDropdownComponents`, `excludeContent`-Parameter), wird aber in der produktiven `FilmDropdown.tsx` nicht genutzt. Die größten Gewinne kommen durch **Integration des vorhandenen Codes**, nicht durch Neuentwicklung.

---

## Ist-Zustand: Die 3 Kernprobleme

**Problem 1: Doppelter Ladepfad.** `useProjectTimeline` nutzt `ultraBatchLoadProject` (1 API-Call). Aber `FilmDropdown.loadTimelineData()` macht 5 separate parallele Calls (`getActs`, `getAllSequences`, `getAllScenes`, `getAllShots`, `getCharacters`). Wenn der React-Query-Cache stale ist, läuft der langsame Fallback.

**Problem 2: Alle Shots sofort geladen.** Sämtliche Shots des gesamten Projekts werden beim initialen Load geholt, obwohl sie erst bei Scene-Expand sichtbar sind. Bei einem typischen Film mit 1.500 Shots ist das massiver unnötiger Overhead.

**Problem 3: TipTap-Content wird mitgeladen.** Der `excludeContent`-Parameter existiert in der API, wird aber nie beim initialen Struktur-Load genutzt. Mehrere KB JSON-Content pro Scene werden unnötig übertragen.

---

## Erwartete Verbesserungen

| Metrik                 | Vorher                      | Nachher (Ziel)            |
| ---------------------- | --------------------------- | ------------------------- |
| Initiale Ladezeit      | 3–5 Sekunden                | 300–500ms                 |
| API-Payload (initial)  | ~2–5 MB (mit Shots+Content) | ~50–200 KB (nur Struktur) |
| Memory-Verbrauch       | ~50 MB                      | ~20 MB                    |
| DnD-Monitore (initial) | ~3.336                      | ~50–80 (nur sichtbare)    |
| API-Calls (initial)    | 5 parallel                  | 1 (Ultra-Batch)           |

---

## PHASE 1: Quick Wins – Sofort-Gewinne

**Aufwand: 2–3 Tage | Erwartete Verbesserung: 60–80% schnelleres Initial-Load**

---

### Task 1.1 — Shots Lazy Loading aktivieren

|             |                                                                |
| ----------- | -------------------------------------------------------------- |
| **Aufwand** | 0,5 Tage                                                       |
| **Impact**  | ⬆️⬆️⬆️ Sehr hoch (−80% Payload)                                |
| **Dateien** | `src/components/FilmDropdown.tsx` (Zeilen 559–574, 404–407)    |
|             | `src/hooks/useLazyLoadShots.ts` (bereits fertig!)              |
|             | `src/components/FilmDropdown.OPTIMIZED_EXAMPLE.tsx` (Referenz) |

**Was tun:**

- **`shots`-State und `getAllShotsByProject` aus dem initialen Load entfernen**
- `useLazyLoadShots`-Hook pro Scene-Komponente einsetzen (lädt Shots erst bei Expand)
- `SceneWithLazyShots`-Pattern aus `OPTIMIZED_EXAMPLE.tsx` übernehmen
- Shots-Daten aus dem Ultra-Batch-Response ebenfalls entfernen (Backend-seitig optional)

**Warum:** Aktuell werden alle 1.500 Shots eines Films sofort geladen, obwohl der User nur kollabierte Act-Header sieht. Der `useLazyLoadShots`-Hook ist fertig implementiert, hat SmartCache mit 60s TTL, AbortController für Request-Cancellation und optimistische UI-Updates – er wird nur nicht benutzt.

---

### Task 1.2 — Content-Exklusion beim Struktur-Load

|             |                                                                              |
| ----------- | ---------------------------------------------------------------------------- |
| **Aufwand** | 0,5 Tage                                                                     |
| **Impact**  | ⬆️⬆️ Hoch (−60% Response-Größe)                                              |
| **Dateien** | `src/lib/api/timeline-api-v2.ts` (`excludeContent`-Parameter, Zeile 110–113) |
|             | `src/lib/timeline-map.ts` (`loadProjectTimelineBundle`)                      |
|             | Backend: `ultra-batch-load` Endpoint                                         |

**Was tun:**

- `excludeContent: true` beim initialen `batchLoadTimeline`/`ultraBatchLoadProject` mitschicken
- Content erst laden wenn eine Scene geöffnet/editiert wird (analog zu `useLazyLoadSceneContent`)
- Backend-Endpoint anpassen: `ultra-batch-load` soll content-Feld bei `excludeContent` weglassen

**Warum:** TipTap-JSON-Content kann pro Scene mehrere KB groß sein. Bei 150 Scenes sind das hunderte KB unnötiger Payload, die nur für Inline-Editing gebraucht werden. Der Parameter existiert bereits in der API-Signatur.

---

### Task 1.3 — Doppelten Ladepfad eliminieren

|             |                                                                        |
| ----------- | ---------------------------------------------------------------------- |
| **Aufwand** | 1 Tag                                                                  |
| **Impact**  | ⬆️⬆️ Hoch (Architektur-Fix)                                            |
| **Dateien** | `src/components/FilmDropdown.tsx` (`loadTimelineData`, Zeilen 523–654) |
|             | `src/hooks/useProjectTimeline.ts`                                      |
|             | Alle Stellen die `FilmDropdown` ohne `initialData` mounten             |

**Was tun:**

- **`loadTimelineData()`-Methode komplett entfernen** aus FilmDropdown
- FilmDropdown IMMER mit `initialData` aus `useProjectTimeline` versorgen
- Wenn kein Cache vorhanden: Loading-Skeleton anzeigen während React Query den Ultra-Batch-Call macht
- Fallback-Logik (5 parallele Calls) komplett entfernen – nur noch 1 Datenpfad

**Warum:** Zwei Ladepfade bedeuten doppelte Maintenance, inkonsistentes Caching und im Worst Case doppelte API-Calls. Der Ultra-Batch-Endpoint existiert genau für diesen Zweck – er sollte der einzige Weg sein.

---

## PHASE 2: Rendering-Optimierung

**Aufwand: 2–3 Tage | Erwartete Verbesserung: 50–70% weniger Re-Renders**

---

### Task 2.1 — Memoized Subcomponents integrieren

|             |                                                                             |
| ----------- | --------------------------------------------------------------------------- |
| **Aufwand** | 1 Tag                                                                       |
| **Impact**  | ⬆️⬆️ Hoch (Re-Render-Reduktion)                                             |
| **Dateien** | `src/components/FilmDropdown.tsx` (gesamte Render-Logik)                    |
|             | `src/components/OptimizedDropdownComponents.tsx` (`MemoizedActHeader` etc.) |
|             | `src/components/FilmDropdown.OPTIMIZED_EXAMPLE.tsx` (Referenz)              |

**Was tun:**

- `MemoizedActHeader`, `MemoizedSequenceHeader`, `MemoizedSceneHeader` aus `OptimizedDropdownComponents.tsx` verwenden
- Inline-JSX für Act/Sequence/Scene-Header durch die memoisierten Varianten ersetzen
- Sicherstellen dass Callback-Props mit `useCallback` stabil sind (sonst bricht `React.memo`)

**Warum:** Ohne `React.memo()` re-rendert jeder Act-Header bei jeder Änderung an irgendeinem State. Die memoisierten Komponenten existieren bereits und sind getestet.

---

### Task 2.2 — State-Updates batchen (useReducer)

|             |                                                                   |
| ----------- | ----------------------------------------------------------------- |
| **Aufwand** | 1 Tag                                                             |
| **Impact**  | ⬆️ Mittel (4 Re-Renders → 1)                                      |
| **Dateien** | `src/components/FilmDropdown.tsx` (`useState` x4, Zeilen 404–407) |
|             | Neuer Hook: `useTimelineReducer.ts`                               |

**Was tun:**

- Die 4 separaten `useState`-Aufrufe (acts, sequences, scenes, shots) in einen `useReducer` zusammenführen
- Dispatch-Action: `{ type: "SET_ALL", payload: { acts, sequences, scenes, shots } }`
- `onDataChange`-Effect vereinfachen: nur bei Reducer-Dispatch triggern

**Warum:** React 18 batcht State-Updates innerhalb von Event-Handlern automatisch, aber NICHT in async-Callbacks (Zeile 612–615). Vier separate `setStates` nach einem API-Call erzeugen 4 Render-Zyklen statt 1.

---

### Task 2.3 — DnD-Hooks nur für sichtbare Elemente

|             |                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------- |
| **Aufwand** | 1 Tag                                                                                        |
| **Impact**  | ⬆️ Mittel (3.336 → ~60 Monitore)                                                             |
| **Dateien** | `src/components/FilmDropdown.tsx` (`DraggableAct`/`Sequence`/`Scene`/`Shot`, Zeilen 160–350) |

**Was tun:**

- DnD-Wrapper nur rendern wenn das Parent-Element expandiert ist
- Kollabierte Acts: keine `DraggableSequence`/`Scene`/`Shot`-Kinder mounten
- Optional: DnD komplett deaktivieren und erst bei langem Press/Hover aktivieren

**Warum:** Jeder `useDrag`/`useDrop`-Hook registriert einen Monitor beim DnD-Backend. Bei 1.500+ Shots sind das tausende Subscriptions die bei jedem Drag-Event alle benachrichtigt werden.

---

## PHASE 3: Code-Splitting & Bundle-Optimierung

**Aufwand: 1–2 Tage | Erwartete Verbesserung: 30–40% schnelleres JS-Parsing**

---

### Task 3.1 — React.lazy für Heavy Components

|             |                                                           |
| ----------- | --------------------------------------------------------- |
| **Aufwand** | 0,5 Tage                                                  |
| **Impact**  | ⬆️ Mittel (Bundle-Size)                                   |
| **Dateien** | `src/components/FilmDropdown.tsx` (Imports, Zeilen 15–55) |
|             | `src/components/ShotCard.tsx`                             |
|             | `src/components/GifAnimationUploadDialog.tsx`             |
|             | `src/components/TimelineNodeStatsDialog.tsx`              |

**Was tun:**

- `const ShotCard = React.lazy(() => import('./ShotCard'))`
- Gleiches für `GifAnimationUploadDialog` und `TimelineNodeStatsDialog`
- `Suspense`-Boundary mit Skeleton-Fallback um die lazy-geladenen Bereiche
- Vite-Config: `manualChunks` für TipTap, react-dnd, Konva konfigurieren

**Warum:** ShotCard, GIF-Dialog und Stats-Dialog werden erst bei Interaktion gebraucht. Aktuell sind sie im Main-Bundle und müssen bei jedem Page-Load geparst werden.

---

### Task 3.2 — Skeleton-First Rendering

|             |                                                                                 |
| ----------- | ------------------------------------------------------------------------------- |
| **Aufwand** | 0,5 Tage                                                                        |
| **Impact**  | ⬆️⬆️ Hoch (Perceived Performance)                                               |
| **Dateien** | `src/components/OptimizedDropdownComponents.tsx` (`LoadingSkeleton` existiert!) |
|             | `src/components/FilmDropdown.tsx` (loading-State)                               |

**Was tun:**

- Sofort 3 leere Act-Boxen (Skeleton) rendern während Daten laden
- `LoadingSkeleton` aus `OptimizedDropdownComponents.tsx` nutzen (existiert bereits)
- Staggered Animation: Skeletons erscheinen nacheinander (Delay 100/200/300ms)
- Transition: Skeleton → echte Daten mit kurzer Fade-Animation

**Warum:** McMaster-Carr zeigt sofort eine Seitenstruktur – der User sieht nie eine leere Seite. Perceived Performance ist oft wichtiger als tatsächliche Ladezeit. Die `LoadingSkeleton`-Komponente ist bereits gebaut.

---

## PHASE 4: McMaster-Stil – Architektur-Level

**Aufwand: 3–5 Tage | Langfristige Skalierung**

---

### Task 4.1 — Ebenenweises Progressive Loading

|             |                                         |
| ----------- | --------------------------------------- |
| **Aufwand** | 2 Tage                                  |
| **Impact**  | ⬆️⬆️⬆️ Sehr hoch (McMaster-Kernprinzip) |
| **Dateien** | `src/hooks/useProjectTimeline.ts`       |
|             | `src/lib/api/timeline-api-v2.ts`        |
|             | Backend: Neue Endpoints oder Parameter  |

**Was tun:**

- **Level 1:** Nur Acts laden (1 Request, ~3 Objekte, <50ms)
- **Level 2:** Bei Act-Expand: Sequences dieser Act laden (~5 Objekte)
- **Level 3:** Bei Sequence-Expand: Scenes dieser Sequence laden (~10 Objekte)
- **Level 4:** Bei Scene-Expand: Shots + Content dieser Scene laden
- Pro Ebene ein eigener React Query Key mit eigenem Cache
- Hover-Prefetch: Bei Mouse-Enter auf einen Act die Sequences im Hintergrund vorladen

**Warum:** Das ist das McMaster-Carr-Kernprinzip: Lade nur was der User gerade sieht, und lade die nächste Ebene im Voraus wenn er drauf zeigt. Statt eines 2–5 MB Monolith-Loads viele kleine <10 KB Micro-Requests die in <50ms fertig sind.

---

### Task 4.2 — API Response-Caching (Edge/CDN)

|             |                                                 |
| ----------- | ----------------------------------------------- |
| **Aufwand** | 1–2 Tage                                        |
| **Impact**  | ⬆️⬆️ Hoch (Netzwerk-Elimination)                |
| **Dateien** | Backend: Appwrite Function Headers              |
|             | CDN/Edge Config (falls vorhanden)               |
|             | `src/lib/api-client.ts` (Cache-Control Headers) |

**Was tun:**

- `Cache-Control: public, max-age=30, stale-while-revalidate=300` auf read-only Endpoints
- ETag-basiertes Conditional Fetching (304 Not Modified)
- Appwrite Function Responses mit kurzer TTL cachen
- Optional: Cloudflare/Vercel Edge Cache für API-Responses

**Warum:** McMaster cached aggressiv auf CDN-Ebene. Die meisten Reads ändern sich zwischen zwei Page-Views nicht. Ein 304-Response ist ~100 Bytes statt ~200 KB und spart den kompletten DB-Roundtrip.

---

## Zeitplan-Übersicht

| Phase       | Aufgabe                 | Dauer    | Impact        | Abhängigkeit |
| ----------- | ----------------------- | -------- | ------------- | ------------ |
| **Phase 1** | 1.1 Lazy Shots          | 0,5 Tage | **Sehr hoch** | Keine        |
|             | 1.2 Content-Exklusion   | 0,5 Tage | **Hoch**      | Keine        |
|             | 1.3 Single Load-Path    | 1 Tag    | **Hoch**      | Keine        |
| **Phase 2** | 2.1 Memoized Components | 1 Tag    | **Hoch**      | Phase 1      |
|             | 2.2 State Batching      | 1 Tag    | Mittel        | 1.3          |
|             | 2.3 DnD Virtualisierung | 1 Tag    | Mittel        | 2.1          |
| **Phase 3** | 3.1 Code-Splitting      | 0,5 Tage | Mittel        | Keine        |
|             | 3.2 Skeleton UI         | 0,5 Tage | **Hoch**      | 1.3          |
| **Phase 4** | 4.1 Progressive Loading | 2 Tage   | **Sehr hoch** | Phase 1–3    |
|             | 4.2 Edge Caching        | 1–2 Tage | **Hoch**      | 4.1          |

> **Gesamtaufwand: 8–12 Arbeitstage**
>
> Phase 1 allein (2–3 Tage) liefert bereits 60–80% der Verbesserung. Phasen 2–4 sind inkrementelle Optimierungen die parallel zur Feature-Entwicklung umgesetzt werden können.

---

## Empfehlung

Start mit Phase 1 – die drei Quick Wins erfordern minimalen Aufwand, weil der Optimierungs-Code größtenteils schon existiert. Nach Phase 1 Performance messen (`window.scriptonyPerf.printReport()`), dann entscheiden ob Phase 2–4 nötig sind. Für die meisten Projekte reichen **Phase 1 + Task 3.2 (Skeleton UI)** für ein McMaster-ähnliches Erlebnis.
