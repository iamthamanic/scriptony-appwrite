# Konzept: Welt, Lore und Projekt (Scriptony)

**Stand:** internes Produktkonzept — Lore entsteht aus den Projekten; die Welt ist der Rahmen zum Sammeln und Vernetzen.

## Kernidee

- **Projekt** = wo die **Geschichte** entsteht: Timeline, Szenen, Shots, Beats, Figuren **in dieser Erzählung**.
- **Welt** = **Kontext- und Lore-Schicht** für dieselbe narrative Space — nicht zwingend „Bibel zuerst, dann Drehbuch“, sondern oft: **Lore wächst mit dem, was in den Projekten geschrieben wird**.
- Technisch kann eine Welt mit einem oder mehreren Projekten verknüpft sein (`world_id` am Projekt, `linked_project_id` an der Welt — je nach Datenmodell).

## Was wohin gehört (Faustregel)

| Inhalt                                         | Typisch                              |
| ---------------------------------------------- | ------------------------------------ |
| Plot, Struktur, Szenenfolge                    | **Projekt**                          |
| „Wer trifft wen“, Dialog, Shot-Plan            | **Projekt**                          |
| Orte, Faktionen, lange Hintergrundtexte, Atlas | **Welt** (`world_items`, Kategorien) |
| Karten, Beziehungsgraph (Lore-Knoten)          | **Welt** (UI: Worldbuilding)         |

**Charaktere** können zunächst **nur im Projekt** leben (Cast dieser Produktion). Eine spätere **Spiegelung** in Lore-Einträgen ist optional.

## Richtung vvd-Nähe

- **Interaktive Karten:** Zonen, Marker, Regionen, Labels; bei uns schrittweise: Persistenz für Karten, Verknüpfung zu Wiki-Einträgen.
- **Graph:** Beziehungen zwischen Lore-Knoten; automatische **Vorschläge** aus der Geschichte (z. B. gemeinsame Szenen) sind möglich; **Relationstypen** oft manuell oder bestätigt.
- **Wiki:** intern zuerst über `world_items` + Kategorien.

## Fehler „Unknown attribute: lore“ (Welten erstellen)

Die Appwrite-Collection `worlds` kennt **kein** Attribut `lore`. Tritt auf, wenn beim Insert noch **zusätzliche Felder** aus dem Request an `createDocument` gelangen.

**Backend-Fix:** Nur erlaubte Felder senden — `worldsInsertPayload` / `worldsUpdatePayload` in `functions/_shared/scriptony.ts`, genutzt in `scriptony-worldbuilding/worlds/`.

Nach Änderung: Function deployen — `npm run appwrite:deploy:worldbuilding`.
