# Timeline Domain Decision — T13

**Status:** `not needed yet`  
**Date:** 2026-04-26  
**Verification Marker:** ARCH-REF-T13-DONE

## Entscheidung: Keine generische `timeline_items` Collection

Eine generische `timeline_items` Collection wuerde zur unkontrollierten Metadatenhalde werden. Stattdessen bleiben die spezialisierten Collections erhalten:

| Entitaet | Collection | Zustaendigkeit | Domain |
|----------|-----------|----------------|--------|
| Shots | `shots` | `scriptony-shots` | Timeline |
| Clips | `clips` | `scriptony-clips` | Timeline |
| Scene Audio Tracks | `scene_audio_tracks` | `scriptony-audio-story` (future `scriptony-audio-production`) | Audio Production |
| Story Beats | `story_beats` | `scriptony-beats` | Structure/Timeline |

## Beziehungen

```
projects
  └── shots (timeline_nodes Level-3 Parent)
        └── clips (NLE-Segmente)
        └── shot_characters (Zuordnung)
        └── shot_audio (Legacy T09 — Assets)
  └── scene_audio_tracks (Audio Production)
  └── story_beats (Structure Bridge)
  └── script_blocks (Script Source of Truth)
        └── speaker_character_id -> characters
        └── node_id -> timeline_nodes
  └── assets (T06)
        └── owner_type="shot" -> shots
        └── owner_type="clip" -> clips
        └── owner_type="script_block" -> script_blocks
```

## Warum keine `timeline_items`

1. **Unterschiedliche Schemas:** Shots (composition, lens, framing) vs. Clips (startSec, endSec, laneIndex) vs. Audio Tracks (character_id, audio_file_id) haben keine gemeinsamen Attribute ausser projekt_id und order_index.
2. **Spezifische Queries:** Jede Entitaet hat eigene Filter- und Sortier-Muster. Eine generische Tabelle wuerde UNION-Queries erzwingen.
3. **KISS:** Zwei Tabellen (`shots`, `clips`) plus `scene_audio_tracks` sind verstaendlicher als eine polymorphe Tabelle.
4. **Migration:** Wenn spaeter dennoch `timeline_items` noetig wird, koennen `shots` und `clips` als `type: "shot" | "clip"` in eine gemeinsame Tabelle migriert werden. Die Collections sind klein genug fuer eine kontrollierte Migration.

## Wann `timeline_items` noetig werden koennte

- Wenn eine **unified Timeline-View** erforderlich wird, die Shots, Clips, Audio Tracks und Beats in einer sortierten Liste anzeigt.
- Wenn **drag-and-drop** ueber Typ-Grenzen hinweg implementiert wird.
- Dann: Migration als `timeline_items` mit `type` + `type_specific_data_json` statt vorzeitigem Over-Engineering.

## Verboten (T13)

- Keine neuen Timeline-Entitaeten in `scriptony-shots` oder `scriptony-clips` ohne explizite Zielentscheidung.
- Keine generische `timeline_items` Collection vor der oben genannten Trigger-Bedingung.
- Keine Timeline-UI-Logik in Backend-Functions (das ist Frontend/Editor-Readmodel T12).

## Ziel-Architektur

Langfristig (nach T21 Collaboration + T14 Jobs + T15 Media Worker):

```
scriptony-timeline
  ├── shots (CRUD, Reorder)
  ├── clips (CRUD, Timing)
  ├── beats (Read-only Bridge)
  └── timeline-readmodel (aggregierte View fuer Editor)
```

`scriptony-shots` und `scriptony-clips` werden zu `scriptony-timeline` gemerged.
