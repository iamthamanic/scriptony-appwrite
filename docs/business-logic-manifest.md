# Scriptony Business-Logik-Manifest

> **Status:** Living Document — bei jeder Feature-Änderung oder Erweiterung aktualisieren.  
> **Letzte Änderung:** 2026-04-23  
> **Zweck:** Zentrale Wissensreferenz für alle Agenten und Entwickler. Keine Annahmen treffen ohne dieses Manifest zu konsultieren oder zu aktualisieren.

---

## 1. Projekttypen (Canon)

| Typ | Bezeichnung | Beschreibung | Status |
|-----|-------------|--------------|--------|
| `film` | Film | Spielfilme, Kurzfilme. Shots, Kamera, Objektiv, Bild/Video. | ✅ Live |
| `series` | Serie | Serien mit Staffeln & Episoden. Sonst wie Film. | ✅ Live |
| `book` | Buch | Geschriebene Bücher. Textbasiert, keine Audio-Produktion. | ✅ Live |
| `audio` | Hörbuch / Hörspiel | Audio-Produktion. Audio-Tracks direkt in Szenen. | 🚧 In Entwicklung |

- **`audio` und `book` sind zwei separate Typen.** `audio` = Hörbuch/Hörspiel (Produktion). `book` = geschriebenes Buch (Text).
- **Keine weiteren Projekttypen** sind aktuell geplant (z. B. Podcast, Documentary, Theater).
- Die Codebase verwendet `Project.format?: "film" | "series" | "short" | "webseries" | "other"` — die Types aus diesem Manifest sind die **kanonischen Business-Typen**, die in der UI entscheidend sind (`film`, `series`, `book`, `audio`). Kurzfilme/Webserien werden unter `film` / `series` behandelt.

---

## 2. Daten-Hierarchie pro Projekttyp

### 2.1 Film
```
Act → Sequence → Scene → Shot → Clip
```

### 2.2 Serie
```
Season → Episode → Act → Sequence → Scene → Shot → Clip
```
- Aktuell **gleiche Hierarchie wie Film**; Episode = zusätzlicher Wrapper ohne eigene Shot-Logik.
- Zukünftige Erweiterung: Staffel-/Episoden-Management mit spezifischer Serie-Logik (später).

### 2.3 Hörbuch / Hörspiel (`audio`)
```
Act → Sequence → Scene → AudioTrack
```
- **Keine Shot-Ebene.** Audio-Tracks sind direkt unter `Scene`.
- Es gibt aber **Szenenbilder** (Scene images) für visuelle Referenz.

### 2.4 Buch (`book`)
```
Act → Sequence → Scene → [Text Section / Content Block]
```
- Der Text lebt auf `Scene.content` (TipTap JSON oder Plaintext).
- `wordCount` ist auf Act-, Sequence- und Scene-Ebene verfügbar.
- Scene.content ist der Leaf-Node (keine Paragraph/Chapter-Ebene unten). Wortzählung erfolgt rekursiv über den Content.

---

## 3. UI-Ansichten (alle Projekttypen)

Jeder Projekttyp hat **drei Kern-Ansichten**, die 1:1 synchron gehalten werden müssen:

### 3.1 Dropdown (Hierarchy View)
- **Vertikale Baum-Ansicht** (Acts → Sequences → Scenes → [Typ-spezifisches]).
- Film/Serie: Zeigt Shots mit Camera/Lens-Metadaten.
- Hörbuch: Zeigt Audio-Tracks **wie Chatnachrichten** (Threads pro Charakter).
- Buch: Zeigt Text-Content mit Word-Count.

### 3.2 Timeline
- **Horizontal, zeitbasiert.**
- Film/Serie: Video-Spuren, Shot-Lanes, Beats.
- Hörbuch: **Mehrere Audio-Spuren übereinander wie FL Studio** (Dialog-Spuren pro Charakter, SFX, Music, Atmo).
- Buch: **Lesedauer-Timeline**. Nicht schnittbasiert — dient als Vorschau für Lesedauer/Lesegeschwindigkeit (WPM). Hier kann eine KI-Stimme das Buch vorlesen und die Geschwindigkeit eingestellt werden. Damit kann jedes Buch direkt als Hörbuch (rein Vorlese-Option) exportiert werden. Die Buch-Timeline existiert in der Codebase, könnte aber beim Refactor verloren gegangen sein und muss wiederhergestellt werden.

### 3.3 Native (= Schriftbasiert / Writing)
- Volltext-Ansicht des gesamten Projekts.
- **Film / Serie:** Drehbuch-Format (Sluglines, Dialog, Action).
- **Buch:** Buch-Text mit Kapitel-Struktur.
- **Hörbuch:** Hörspielskript (Szene-Überschriften, Dialoge, SFX-Annotations).

> **Früher als Writing / Fullscreen Script bezeichnet — heute als Native-Ansicht geführt.**

---

## 4. Feature-Matrix

| Feature | Film | Serie | Buch | Hörbuch (`audio`) |
|---------|------|-------|------|-------------------|
| **Shots (Camera, Lens, Framing)** | ✅ Hauptfeature | ✅ Hauptfeature | ❌ | ❌ (nur Szenenbilder) |
| **Clip / Schnitt** | ✅ | ✅ | ❌ | ❌ |
| **Audio-Tracks (Dialog/SFX/Music/Atmo)** | ✅ Optional (für Produktion) | ✅ Optional | ❌ | ✅ **Hauptfeature** |
| **Episoden / Staffeln** | ❌ | ✅ | ❌ | ❌ |
| **Bild / Video Uploads** | ✅ | ✅ | ❌ (ggf. Cover) | ❌ (nur Audio) |
| **Character Dialogue / Assignments** | ✅ | ✅ | ✅ | ✅ |
| **Character Voice Casting** | ❌ | ❌ | ❌ | ✅ |
| **Recording Sessions** | ❌ | ❌ | ❌ | ✅ |
| **Beats (Struktur-Marken)** | ✅ | ✅ | ✅ | ✅ |
| **Timeline mit Spuren** | ✅ | ✅ | ✅ (Lesedauer-Timeline) | ✅ (Audio-basiert) |
| **Style-Guide** | ✅ | ✅ | ✅ | ✅ |
| **Character-Verwaltung** | ✅ | ✅ | ✅ | ✅ |
| **Projekt-Informationen** | ✅ | ✅ | ✅ | ✅ |

---

## 5. Synchronisations-Regeln (1:1)

Die folgenden Daten müssen in **allen drei Ansichten** sofort synchron sein (Shared State / React Query / Realtime):

1. **Reihenfolge** von Acts / Sequences / Scenes (und bei Film/Serie: Shots).
2. **Dauer / Timing** — jede Szene hat eine `duration`.
3. **Charakter-Zuordnung** — welche Charaktere in welcher Szene vorkommen.
4. **Textcontent (Dialog)** — jede Text-Änderung muss sofort in allen Ansichten reflektiert sein.

### Ansichtsspezifische Features
- Features, die **nur in einer Ansicht** existieren (z. B. Beats nur in Timeline, Aufnahme-Sessions nur im Dropdown), **bleiben ansichtsspezifisch**.
- Sie müssen aber **modular** in der Codebase hinterlegt sein, sodass sie später auf andere Ansichten umschaltbar sind.

---

## 6. Hörbuch-spezifisches UX-Konzept

### 6.1 Dropdown-Ansicht (Chat-like)
Audio-Tracks werden **wie Chatnachrichten** dargestellt:

```
┌─ Scene: "Der Anruf" ──────────────┐
│                                    │
│  🎭 [Justus] "Hier ist Justus!"   │
│  🎭 [Peter]  "Was ist los?"        │
│  🔊 [SFX]    Telefonklingeln       │
│  🎵 [Music]  Spannungsmusik        │
│  🌊 [Atmo]   Büro-Geräusche        │
│                                    │
│  [Add Track] [Start Recording]     │
└────────────────────────────────────┘
```

- **Mehrere Dialog-Spuren pro Charakter** werden wie **Chat-Threads** gerendert.
- SFX, Music, Atmo sind **kontinuierliche Spuren** (nicht punktuelle Events).

### 6.2 Timeline-Ansicht (FL-Studio-like)
- Mehrere übereinanderliegende Audiospuren.
- Jeder Charakter hat eigene Dialog-Lane(s).
- Separate Lanes für SFX, Music, Atmo.
- Beats als vertikale Marker über alle Spuren.

### 6.3 Audio-Track-Typen
| Typ | Beschreibung |
|-----|--------------|
| `dialog` | Gesprochener Dialog eines Charakters |
| `narrator` | Erzähler-Stimme (Voice-over) |
| `music` | Musik-Spur |
| `sfx` | Sound Effects |
| `atmo` | Atmosphäre / Ambience |

- Tracks sind **frei hinzufügbar**. Keine harte Begrenzung.

### 6.4 Audio-Track Defaults (bei neuem Audio-Projekt)
- **1 SFX-Spur** (Default).
- **1 Sprecher-Spur** (Default).
- Pro Charakter im Projekt gibt es **eine eigene Sprecher-Spur** (Dialog-Lane).
- Nutzer können **unendlich viele** zusätzliche Spuren hinzufügen (auch "pro Serie" im Sinne von unbegrenzt).

### 6.4 Voice Casting & Recording
- Jedem Charakter kann eine Stimme zugewiesen werden (`human` oder `tts`).
- TTS-Einstellungen (Voice ID, Emotion, Speed) pro Charakter speicherbar.
- Recording Sessions mit Teilnehmer-Rollen (Speaker, Director, Technician, Observer).

---

## 7. Beats-Integration

- **Beats sind Struktur-Elemente**, die auf Act-, Sequence- und Scene-Ebene existieren.
- Sie definieren das narrativ-strukturelle Rückgrat (z. B. "Aufbruch", "Konfrontation", "Lösung").
- **Primäre Visualisierung:** In der Timeline als vertikale Marker (ähnlich FL Studio Markers).
- **Sekundäre Darstellung:** Im Dropdown als farbige Labels / Abzeichen auf Act/Sequence/Scene-Ebene. **Aktuell nicht implementiert** (zu komplex, aufgeschoben).
- Beats sind **keine eigene Daten-Ebene** — sie sind Metadaten auf Acts, Sequences oder Scenes (via `summary` und `beat_template`).

---

## 8. Naming-Konventionen

### 8.1 Komponenten-Namen (pro Ansicht & Typ)
| Alte / Generische Bezeichnung | Neue Bezeichnung (Empfohlen) |
|------------------------------|------------------------------|
| `FilmDropdown.tsx` | `FilmDropdown.tsx` (Behält Name, bekommt ggf. `View`-Suffix wenn es Views sind) |
| — | `SeriesDropdown.tsx` / `SeriesDropdownView.tsx` |
| — | `AudioDropdown.tsx` / `AudioDropdownView.tsx` |
| `BookDropdown.tsx` | `BookDropdown.tsx` |
| `ShotCard.tsx` | `FilmShotCard.tsx` / `ShotCard.tsx` (Legacy, für Film/Serie) |
| `AudioSceneCard.tsx` | `AudioSceneCard.tsx` |
| `SceneContentRenderer.tsx` | **Entscheidet pro Projekt-Typ welche Komponente geladen wird** |

> **Regel:** Der Begriff `Dropdown` bleibt erhalten (nicht in `HierarchyView` umbenennen). Das Suffix `View` ist optional für Wrapper/Container.

### 8.2 Zentrale Typ-Logik (Architektur-Empfehlung)

Statt verteilter `if (type === 'audio')` Checks soll es ein **Registry-basiertes Feature-System** geben:

```typescript
// src/lib/projectTypes.ts
export const projectTypeRegistry = {
  film: {
    features: { shots: true, clips: true, audioTracks: "optional", episodes: false, ... },
    hierarchy: ["Act", "Sequence", "Scene", "Shot", "Clip"],
    views: {
      dropdown: FilmDropdown,
      timeline: FilmTimeline,
      native: FilmNativeView,
    },
  },
  audio: {
    features: { shots: false, clips: false, audioTracks: "required", episodes: false, ... },
    hierarchy: ["Act", "Sequence", "Scene", "AudioTrack"],
    views: {
      dropdown: AudioDropdown,
      timeline: AudioTimeline,
      native: AudioNativeView,
    },
  },
  // ...
};
```

- **Keine hartkodierten if/else-Ketten** in Komponenten.
- Neue Projekttypen werden **per Registry-Eintrag** hinzugefügt, ohne existierende Typen zu verändern.
- Ein `useProjectType()` Hook greift auf die Registry zurück.

---

## 9. Erweiterbarkeit (Zukunftssicherheit)

### 9.1 Neuer Projekttyp (z. B. Podcast in 3 Monaten)
Um einen neuen Typ `podcast` hinzuzufügen, müssen minimal folgende Schritte geschehen:

1. **Typ-Definition** in `Project.format` und `projectTypeRegistry` hinzufügen.
2. **Hierarchie** definieren (z. B. `Season → Episode → Segment → AudioTrack`).
3. **Feature-Flags** setzen (`shots: false`, `audioTracks: "required"`, `episodes: true`).
4. **Ansichts-Komponenten** registrieren (oder Fallback auf `audio` verwenden).
5. **API-Layer** anpassen, falls neue Collections nötig (z. B. `podcast_segments`).

### 9.2 Plugin-System (Vision)
Langfristig ist ein **Feature-Plugin-System** sinnvoll:
- Ein Projekttyp registriert nicht nur Views, sondern auch **Feature-Module** (z. B. `recording-module`, `shot-module`, `beat-module`).
- Jedes Modul definiert: seine Datenbank-Collections, seine API-Endpoints, seine UI-Komponenten und seine Synchronisations-Regeln.
- Vorteil: Ein neuer Typ kann existierende Module (z. B. `audio-tracks`) wiederverwenden, ohne sie zu kopieren.
- **Status:** [TBD] — aktuell reicht die Registry-Lösung. Plugin-System bei >5 Projekttypen evaluieren.

---

## 10. Offene Punkte / TBD

| # | Punkt | Blockiert Manifest? | Priorität |
|---|-------|---------------------|-----------|
| 1 | **Buch-Timeline wiederherstellen:** Lesedauer-Timeline + KI-Vorlesen (TTS). Prüfen ob Code beim Refactor verloren ging. | Ja | High |
| 2 | **Hörbuch → Film Konversion:** Szenenbilder aus `audio` als Shots übernehmbar? Konvertierungslogik? Future Feature. | Nein | Low (Future) |
| 3 | **Podcast / Theater:** Keine aktuellen Pläne, Plugin-System evaluieren bei >5 Typen. | Nein | Low |

---

## 11. Änderungshistorie

| Datum | Änderung | Autor |
|-------|----------|-------|
| 2026-04-23 | Manifest erstellt aus Agenten-Konversation + Codebase-Analyse | AI Agent |
| 2026-04-23 | TBDs geklärt: Buch-Timeline, Audio-Track Defaults, Beats in Dropdown, Serien-Hierarchie | AI Agent |

---

> **Regel für Agenten:** Dieses Dokument ist die Quelle der Wahrheit. Wenn du Code schreibst, der Projekttypen, Features oder UI-Ansichten betrifft, stelle sicher dass er mit diesem Manifest übereinstimmt. Wenn du eine Inkonsistenz findest oder eine Erweiterung baust, aktualisiere dieses Manifest **vor** oder **mit** dem Code-Change.
