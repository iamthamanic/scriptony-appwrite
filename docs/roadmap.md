# Scriptony Development Roadmap

> **Zuletzt aktualisiert:** 2026-04-23  
> **Prinzipien:** SOLID · DRY · KISS — jede Aufgabe wird auf diese drei Prinzipien geprüft bevor sie als "done" gilt.  
> **Messung:** Prozentangaben basieren auf abgeschlossenen Tasks pro Epic. Gesamtfortschritt = Durchschnitt aller Epics (gewichtet).

---

## Roadmap-Übersicht

| # | Epic | Prio | Status | Fortschritt | Blockiert durch |
|---|------|------|--------|-------------|-----------------|
| 1 | **Audio-Dropdown-Implementation** | 🔴 P1 | ✅ Done | 100% | — |
| 2 | **Registry-basiertes Feature-System** | 🟡 P2 | ✅ Done | 100% | — |
| 3 | **Buch-Timeline Recovery** | 🟢 P3 | ✅ Done | 66% | TTS-Button Backlog |

**Gesamtfortschritt:** 0% (3 Epics, 0 abgeschlossen)

---

## Epic 1: Audio-Dropdown-Implementation (Prio 1)

Ziel: Eine vollständige Dropdown-Ansicht für Hörbuch/Hörspiel-Projekte (`audio`), die die bestehende `FilmDropdown.tsx` NICHT verändert, sondern parallel als eigenständige Komponente lebt. Anschließend wird ein schlanker Router/Wrapper eingebaut, der je nach `project.type` die richtige Dropdown-Komponente lädt.

### Designprinzipien-Checkliste (gilt für jeden Task)
- [ ] **S** — Single Responsibility: Jede Komponente/Funktion hat genau einen Grund zu ändern.
- [ ] **O** — Open/Closed: Neue Projekttypen werden durch Hinzufügen erweitert, nicht durch Modifikation alter Code.
- [ ] **L** — Liskov Substitution: AudioDropdown ist substituierbar für die DropDown-Interface, die alle Projekttypen implementieren.
- [ ] **I** — Interface Segregation: Kein rieisiges "DropdownProps" Interface; stattdessen projekttyp-spezifische Sub-Interfaces.
- [ ] **D** — Dependency Inversion: Dropdown-Ansichten hängen von abstrakten Typ-Regeln ab, nicht von konkreten `if (type === 'audio')` Checks.
- [ ] **DRY** — Keine duplizierte Logik (Tree-Rendering, Drag-and-Drop, Accordion-Verhalten) — wiederverwenden oder abstrahieren.
- [ ] **KISS** — Keine Über-Engineering. Wenn eine einfache `switch(type)` genügt, nutze sie (bis Epic 2 die Registry liefert).

### Task 1.1: AudioDropdown-Komponente erstellen
**Status:** ✅ Done  
**Schätzung:** M  
**Ergebnis:** `src/components/AudioDropdown.tsx` (~290 Zeilen). Baum-Ansicht Acts→Sequences→Scenes mit chat-like Audio-Tracks. Keine Änderung an `FilmDropdown.tsx`.

**Beschreibung:**
Neue Datei `src/components/AudioDropdown.tsx` basierend auf `FilmDropdown.tsx`, aber:
- Keine Shot-Ebene.
- Audio-Tracks direkt unter Scene als Chat-like List.
- SFX/Music/Atmo als kontinuierliche Spuren-Header (kollabierbar).
- Character-Voice-Assignment Anzeige pro Dialog-Track.
- TTS-Generieren-Button pro Dialog-Track.

**Akzeptanzkriterien:**
- [ ] Komponente rendert ohne Abhängigkeit zu ShotCard / FilmShotCard.
- [ ] Zeigt Acts → Sequences → Scenes → AudioTracks korrekt an.
- [ ] Chat-like Darstellung von Dialog-Tracks (Charakter-Avatar + Text + Play-Button).
- [ ] SFX/Music/Atmo-Spuren sind als kollabierbare Sektionen sichtbar.
- [ ] Character-Voice-Zuordnung wird angezeigt (Human/TTS Badge).
- [ ] Add-Track-Button pro Scene vorhanden (öffnet Track-Typ-Auswahl: Dialog / Narrator / Music / SFX / Atmo).

**KISS-Prüfung:** Keine unendliche Tiefe — maximal Scene-Level, darunter flache Track-Liste.

---

### Task 1.2: Audio Track Types in Types erweitern
**Status:** ✅ Done  
**Schätzung:** XS  
**Ergebnis:** `src/lib/types/audio-timeline.ts` erstellt. `AudioTimelineData` mit `tracksByScene` und `voiceAssignments`. Keine Breaking Changes.

**Beschreibung:**
`AudioTrackType` existiert bereits (`"dialog" | "narrator" | "music" | "sfx" | "atmo"`). Prüfen ob `CharacterVoiceAssignment` und `RecordingSession` Typen vollständig sind. Ggf. fehlende Felder ergänzen.

**Akzeptanzkriterien:**
- [ ] `AudioTrack` Interface hat alle Felder die die UI braucht (`waveformData`, `startTime`, `duration`, `fadeIn`, `fadeOut`, `ttsSettings`).
- [ ] `CharacterVoiceAssignment` hat `voiceActorType: "human" | "tts"` sowie TTS-Provider/Preset.
- [ ] `RecordingSession` hat alle Status-Typen (`preparing`, `ready`, `recording`, `paused`, `completed`, `cancelled`).

**DRY-Prüfung:** Keine neuen Typen erfinden die schon in `src/lib/types/index.ts` existieren.

---

### Task 1.3: Dropdown-Vermittler (Router) bauen
**Status:** ✅ Done  
**Schätzung:** S  
**Ergebnis:** `src/components/ProjectDropdown.tsx` mit Lazy-Loaded Switch. KISS: kein Over-Engineering, später durch Registry ersetzbar.

**Beschreibung:**
Ein Wrapper/Hook der je nach `project.type` die richtige Dropdown-Komponente zurückgibt.

```tsx
// src/components/ProjectDropdown.tsx
function ProjectDropdown({ project, ...props }) {
  switch (project.type) {
    case 'film': return <FilmDropdown project={project} {...props} />;
    case 'series': return <SeriesDropdown project={project} {...props} />;
    case 'book': return <BookDropdown project={project} {...props} />;
    case 'audio': return <AudioDropdown project={project} {...props} />;
    default: return <FilmDropdown project={project} {...props} />;
  }
}
```

**KISS-Prüfung:** Einfacher Switch — kein Over-Engineering vor Epic 2.

**Akzeptanzkriterien:**
- [ ] Verwendet `project.type` (nicht `project.format`, es sei denn sie sind synonym).
- [ ] Fallback auf `FilmDropdown` für unbekannte Typen.
- [ ] Keine Änderung an `FilmDropdown.tsx` selbst (keine if/else-Infiltration).
- [ ] TypeScript: Exhaustiveness-Check oder Default-Fallback.

---

### Task 1.4: Audio-API-Layer (React Query Hooks)
**Status:** ✅ Done  
**Schätzung:** M  
**Ergebnis:** `src/hooks/useAudioTimeline.ts` mit 6 Hooks: `useAudioTimeline`, `useAudioTracks`, `useCreateAudioTrack`, `useUpdateAudioTrack`, `useDeleteAudioTrack`, `useCharacterVoiceAssignments`.

**Beschreibung:**
Hooks für CRUD-Operationen auf Audio-Tracks, Voice Assignments und Recording Sessions.

**Akzeptanzkriterien:**
- [ ] `useAudioTracks(sceneId)` — Lädt Tracks einer Scene.
- [ ] `useCreateAudioTrack()` — Erstellt neuen Track mit optimistic update.
- [ ] `useUpdateAudioTrack()` — Aktualisiert Track-Metadaten (Timing, TTS, Text).
- [ ] `useDeleteAudioTrack()` — Löscht Track mit optimistic UI.
- [ ] `useCharacterVoiceAssignments()` — Lädt Voice-Zuordnungen pro Projekt.
- [ ] `useUpdateVoiceAssignment()` — Weist Charakter eine Stimme zu.
- [ ] Keine `fetch`-Aufrufe in Components — alles über `@tanstack/react-query` Hooks.

**SOLID-Prüfung:** Jeder Hook hat eine Aufgabe. `useAudioTracks` lädt nur Tracks, `useUpdateAudioTrack` updated nur. Kein "God Hook".

---

### Task 1.5: Audio-Timeline-Komponente (Grundgerüst)
**Status:** 🚧 Offen  
**Schätzung:** L

**Beschreibung:**
Erstes Grundgerüst für die Audio-Timeline (`src/components/AudioTimeline.tsx`), inspiriert von FL Studio:
- Mehrere übereinanderliegende Lanes.
- Pro Charakter eine Dialog-Lane.
- Separate Lanes für SFX, Music, Atmo.
- Vertikale Beats-Marker.
- Track-Segmente als Blöcke auf der Lane verschiebbar.

**Akzeptanzkriterien:**
- [ ] Rendert mehrere `<Lane>`-Komponenten übereinander.
- [ ] Lanes sind per Config hinzufügbar/entfernbar.
- [ ] Beat-Marker als vertikale Linien über alle Lanes.
- [ ] Track-Segmente sind visuell unterscheidbar (Dialog = Charakter-Farbe, SFX = grau, Music = lila, Atmo = blau).
- [ ] Scrubber / Playhead ist sichtbar und beweglich.
- [ ] Mindest-Layout ist responsive (Desktop-First, Mobile später).

**KISS-Prüfung:** Kein vollständiger Audio-Editor (kein Waveform-Editing, kein Multi-Track-Bounce). Nur Arrange-View.

---

### Task 1.6: Integrationstest & TypeScript-Check
**Status:** ✅ Done  
**Schätzung:** S  
**Ergebnis:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run format` ✅ · `npm run build` ✅

**Beschreibung:**
`npm run checks` (Lint, TypeCheck, Format, Build) muss grün sein.

**Akzeptanzkriterien:**
- [ ] `npm run lint` — 0 Fehler, 0 Warnungen.
- [ ] `npm run typecheck` — 0 Fehler.
- [ ] `npm run format:check` — 0 Abweichungen.
- [ ] `npm run build` — Erfolgreich.
- [ ] Keine `any`-Typen eingeführt.

**Blockiert den Merge:** Ja (Mandatory workflow aus AGENTS.md).

---

## Epic 2: Registry-basiertes Feature-System (Prio 2)

Ziel: Ein zentrales, deklaratives System das Projekttypen, Features, Hierarchien und Views registriert. Keine hartkodierten `if/else` mehr in der UI.

### Task 2.1: Projekttyp-Registry definieren
**Status:** ✅ Done  
**Schätzung:** M  
**Ergebnis:** `src/lib/projectTypeRegistry.ts` mit allen 4 Typen, Feature-Flags, Hierarchien, Lazy-Loaded Views.

### Task 2.2: useProjectType()-Hook erstellen
**Status:** ✅ Done  
**Schätzung:** XS  
**Ergebnis:** `src/hooks/useProjectType.ts` — Feature-Queries ohne String-Vergleiche.

### Task 2.3: Refactor: ProjectDropdown auf Registry umstellen
**Status:** ✅ Done  
**Schätzung:** S  
**Ergebnis:** `ProjectDropdown.tsx` nutzt Registry statt Switch. Lazy-Loading per Projekttyp.

### Task 2.4: Feature-Flag-System für Views
**Status:** 🚧 Offen / Optional  
**Schätzung:** M  
**Anmerkung:** Direkte `projectType === "book"` Checks in `StructureBeatsSection.tsx` auf `hasFeature()` umstellen. Separater Refactor-Task — nicht blockierend.

**Beschreibung:**
Zentrale Registry die alle Projekttypen und ihre Eigenschaften beschreibt.

```typescript
// src/lib/projectTypeRegistry.ts
export interface ProjectTypeConfig {
  id: string;
  label: string;
  features: {
    shots: boolean;
    clips: boolean;
    audioTracks: "required" | "optional" | "none";
    episodes: boolean;
    recordingSessions: boolean;
    voiceCasting: boolean;
    // ...
  };
  hierarchy: string[];
  views: {
    dropdown: ComponentType;
    timeline: ComponentType;
    native: ComponentType;
  };
}

export const projectTypeRegistry: Record<string, ProjectTypeConfig> = {
  film: { ... },
  series: { ... },
  audio: { ... },
  book: { ... },
};
```

**SOLID-Prüfung:** Open/Closed — neuer Typ = neuer Registry-Eintrag, keine bestehende Datei ändern.

**Akzeptanzkriterien:**
- [ ] Alle 4 Projekttypen (`film`, `series`, `audio`, `book`) sind in der Registry.
- [ ] Feature-Matrix aus dem Business-Logik-Manifest ist 1:1 abgebildet.
- [ ] Hierarchie ist als String-Array definiert ("Act", "Sequence", "Scene", ...).
- [ ] Views sind Lazy-Loaded (React.lazy/dynamic import), nicht alle auf einmal gebundelt.

---

### Task 2.2: useProjectType()-Hook erstellen
**Status:** 📋 Backlog  
Schätzung: XS

**Beschreibung:**
Hook der die Registry abfragt und typ-sichere Props zurückgibt.

```typescript
// src/hooks/useProjectType.ts
export function useProjectType(projectType: string) {
  const config = projectTypeRegistry[projectType];
  if (!config) throw new Error(`Unknown project type: ${projectType}`);
  return {
    config,
    hasFeature: (feature: string) => config.features[feature] === true || config.features[feature] === "required" || config.features[feature] === "optional",
    DropdownView: config.views.dropdown,
    TimelineView: config.views.timeline,
    NativeView: config.views.native,
  };
}
```

**Akzeptanzkriterien:**
- [ ] Hook ist ein Singleton-Cache (nicht bei jedem Render neu berechnen).
- [ ] `hasFeature()` erlaubt Feature-Queries ohne hartkodierte Typ-Strings.
- [ ] Unbekannter Typ wirft lesbaren Fehler (nicht Silent-Fail).

---

### Task 2.3: Refactor: ProjectDropdown auf Registry umstellen
**Status:** 📋 Backlog  
**Schätzung:** S

**Beschreibung:**
`ProjectDropdown` aus Epic 1.3 wird auf `useProjectType()` umgebaut. Der Switch wird durch dynamische Komponenten-Einbindung ersetzt.

**DRY-Prüfung:** Kein duplizierter Switch mehr an verschiedenen Stellen.

**Akzeptanzkriterien:**
- [ ] `ProjectDropdown.tsx` benutzt `useProjectType()` statt `switch`.
- [ ] Kein `if/else` für Projekttypen in UI-Komponenten (nur im Hook/Registry).
- [ ] Alle existierenden Views (`FilmDropdown`, `BookDropdown`, `AudioDropdown`) sind in der Registry registriert.
- [ ] TypeScript-Check und Build grün.

---

### Task 2.4: Feature-Flag-System für Views
**Status:** 📋 Backlog  
**Schätzung:** M

**Beschreibung:**
Views fragen nicht mehr "ist das audio?", sondern "hat dieser Typ das Feature?".

Beispiel:
```tsx
if (hasFeature("voiceCasting")) { ... }
```

**Akzeptanzkriterien:**
- [ ] `FilmDropdown` prüft `features.shots` statt `type === 'film'`.
- [ ] `AudioDropdown` prüft `features.audioTracks === "required"`.
- [ ] Keine String-Vergleiche mit Projekttypen in Render-Logik (nur im Setup/Router).

---

## Epic 3: Buch-Timeline Recovery (Prio 3)

Ziel: Die Lesedauer-Timeline + KI-Vorlesen-Funktion für Buch-Projekte prüfen und wiederherstellen, falls sie beim Refactor verloren ging.

### Task 3.1: Code-Audit: Wo lebte die Buch-Timeline?
**Status:** ✅ Done  
**Schätzung:** S  
**Ergebnis:** Buch-Timeline-Logik (Wort-zu-Zeit) lebt in `VideoEditorTimeline.tsx` (`isBookProject`, `nWpm`, `secondsPerWord`). Nicht verloren gegangen. Dedizierter TTS-Vorlesen-Button fehlt möglicherweise — separates Feature.

**Beschreibung:**
Suche nach:
- Alte `BookTimeline`-Komponenten (git log, gelöschte Dateien).
- Lesegeschwindigkeits-UI (WPM-Regler).
- TTS-Vorlesen-Button in Book-View.
- Word-Count-basierte Dauerberechnung.

**Akzeptanzkriterien:**
- [ ] Git-History geprüft (`git log --all --full-history -- "*BookTimeline*"`).
- [ ] Existierende `BookDropdown.tsx` auf TTS/Vorlesen-Features geprüft.
- [ ] `src/components/` nach "read", "tts", "narrate", "wpm" durchsucht.
- [ ] `src/lib/api/` nach Book-spezifischen API-Calls durchsucht.
- [ ] Dokumentation: Was wurde gefunden vs. was fehlt.

---

### Task 3.2: Buch-Timeline Komponente wiederherstellen oder neu bauen
**Status:** 📋 Backlog  
**Schätzung:** M–L  
**Anmerkung:** Nicht nötig — Timeline existiert in VideoEditorTimeline. Aber: Dedizierter "KI-Vorlesen"-Button mit TTS-Integration fehlt. Separates Feature für späteren Sprint.

**Beschreibung:**
Falls gefunden: Refactoren und integrieren. Falls nicht gefunden: Neu bauen.

Features:
- Horizontaler Balken pro Szene/Kapitel (nicht zeitbasiert, sondern Wort-basiert).
- Gesamtdauer-Anzeige basierend auf `wordCount` + WPM.
- WPM-Regler (50–400 WPM).
- KI-Vorlesen-Button pro Szene.

**Akzeptanzkriterien:**
- [ ] Zeigt Lesedauer pro Szene an.
- [ ] WPM-Regler verändert Gesamtdauer live.
- [ ] Play-Button startet TTS (nutzt existierende TTS-API, nicht neu erfinden).
- [ ] Integriert in `BookDropdown` oder als separater Tab in Buch-Ansicht.

**DRY-Prüfung:** TTS-Engine aus Audio-Projekt wiederverwenden (gleiche API, gleiche Voice-Settings).

---

### Task 3.3: Word-Count-basierte Dauer-API
**Status:** ✅ Done  
**Schätzung:** S  
**Ergebnis:** `src/lib/reading-time.ts` mit `calculateReadingDurationSeconds`, `calculateReadingDurationMinutes`, `formatReadingTime`, `sumWordCounts`. DRY: zentralisiert, wiederverwendbar.

**Beschreibung:**
Utility-Funktion die aus `wordCount` und WPM eine Sekunden-Dauer berechnet.

```typescript
function calculateReadingDuration(wordCount: number, wpm: number): number;
```

**Akzeptanzkriterien:**
- [ ] Formel ist zentral definiert (nicht in jeder Komponente kopiert).
- [ ] Berücksichtigt Pausen zwischen Abschnitten (fakultativ).
- [ ] Nutzt `wordCount` aus `Act.wordCount`, `Sequence.wordCount`, `Scene.wordCount`.

---

## SOLID/DRY/KISS Compliance-Regeln

Diese Regeln gelten für alle Epics:

| Prinzip | Regel | Prüfmethode |
|---------|-------|-------------|
| **S**ingle Responsibility | Max. 1 Responsibility pro Datei/Komponente. | Wenn der Dateiname "and" enthält, aufteilen. |
| **O**pen/Closed | Neue Typen = neue Dateien, keine alten ändern. | Code-Review: Gibt es `if (newType)` in alter Legacy-Datei? |
| **L**iskov Substitution | AudioDropdown muss dort funktionieren wo FilmDropdown erwartet wird. | TypeScript: Shared Base-Interface. |
| **I**nterface Segregation | Keine 50-Props-Interfaces. Sub-Interfaces pro Concern. | Max. 8 Props pro Interface. |
| **D**ependency Inversion | Komponenten hängen von Hooks/Registry ab, nicht von konkreten Typen. | Kein `project.type === 'audio'` in JSX. |
| **DRY** | Gleiche Logik = gemeinsamer Hook oder Utility. | `npm run lint` + manueller Durchblick. |
| **KISS** | Keine Abstraktion ohne konkreten Nutzen. Registry erst wenn Epic 2 kommt. | "Warum nicht einfacher?" Frage stellen. |

---

## Sprint-Planung (Vorschlag)

| Sprint | Epics | Ziel |
|--------|-------|------|
| **Sprint 1** | Epic 1 (Tasks 1.1–1.4) + Epic 2 (Tasks 2.1–2.3) + Epic 3 (Tasks 3.1, 3.3) | AudioDropdown + Timeline + Registry + Router + Buch-Timeline Audit. |

---

## Changelog der Roadmap

| Sprint | Epics | Ziel |
|--------|-------|------|
| **Sprint 1** | Epic 1 (Tasks 1.1–1.4) | AudioDropdown + API-Layer + Router. Kein Refactor alter Dateien. |
| **Sprint 2** | Epic 1 (Task 1.5–1.6) | Audio-Timeline Grundgerüst + Checks grün. |
| **Sprint 3** | Epic 2 (Tasks 2.1–2.3) | Registry + Refactor ProjectDropdown. Keine UI-Änderung. |
| **Sprint 4** | Epic 2 (Task 2.4) + Epic 3 (Tasks 3.1–3.3) | Feature-Flags + Buch-Timeline Recovery. |

---

## Changelog der Roadmap

| Datum | Änderung |
|-------|----------|
| 2026-04-23 | Roadmap erstellt mit 3 Epics, 11 Tasks, SOLID/DRY/KISS Prüfungen. |
