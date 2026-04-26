# Scriptony Architecture Refactor Tickets

Stand: 2026-04-25

## Ziel

Diese Tickets stabilisieren die Appwrite Function-Architektur phasenweise. Das Ziel ist nicht, alle Functions sofort physisch umzubauen, sondern neue Arbeit ab sofort eindeutig nach Verantwortungsgrenzen zu sortieren und fehlende Kern-Domaenen zuerst zu bauen.

## Zielarchitektur

| Gruppe | Functions |
| --- | --- |
| Core | `scriptony-auth`, `scriptony-projects`, `scriptony-structure`, `scriptony-script`, `scriptony-characters`, `scriptony-worldbuilding`, `scriptony-timeline`, `scriptony-editor-readmodel` |
| Media | `scriptony-assets`, `scriptony-audio`, `scriptony-image`, `scriptony-video`, `scriptony-media-worker` |
| Workflows | `scriptony-audio-production`, `scriptony-stage`, `scriptony-stage2d`, `scriptony-stage3d`, `scriptony-style`, `scriptony-style-guide`, `scriptony-sync`, `scriptony-gym` |
| Platform | `scriptony-ai`, `scriptony-assistant`, `scriptony-jobs`, `scriptony-observability`, `scriptony-admin`, `scriptony-mcp-appwrite`, `scriptony-storage`, `scriptony-collaboration` |
| Legacy | `jobs-handler`, `make-server-3b52693b` |

## Arbeitsregeln

- Neue Features muessen vor Codeaenderung in der Domain Map einer Ziel-Function zugeordnet sein.
- Jede Code-Phase beginnt mit Analyse der betroffenen Dateien, Routen, Collections, Buckets, Env Vars und Frontend-Aufrufer.
- Keine Breaking Changes ohne Compatibility Wrapper oder dokumentierte Migration.
- Keine technische Provider-Logik in Produkt-Orchestration.
- Keine Produktlogik in technischen Media APIs.
- Keine Upload-Duplikation ausserhalb von `scriptony-assets`.
- Keine Job-Status-Duplikation ausserhalb von `scriptony-jobs`.
- Kein Script-/Dialogtext in `scriptony-audio-production` als Source of Truth.
- Keine Editor-Aggregation in `scriptony-structure`.
- `_shared` enthaelt primitive Infrastruktur, Typen, Permission-Primitives und kleine Adapter, aber keine Workflow-Orchestration.
- `scriptony-storage` besitzt Storage Provider, Storage-OAuth, Storage Connections, Storage Targets, Storage Objects, Sync, Import und Export.
- `scriptony-assets` besitzt fachliche Asset-Metadaten, nicht Provider-OAuth oder physische Storage-Strategie.
- Asset-Uploads muessen ueber eine Storage-Abstraktion laufen. Initial darf diese Appwrite Storage verwenden.
- `scriptony-collaboration` besitzt Projektfreigaben, Mitglieder, Rollen, Einladungen, Organisationen/Workspaces und Access Checks.
- Direkte Projektfreigabe ohne Organisation muss moeglich bleiben.
- Neue Domain-Functions duerfen Projektzugriff nicht direkt ueber `project.created_by` pruefen.
- Neue Domain-Functions muessen Access-Helper wie `canReadProject`, `canEditProject`, `canManageProject` verwenden.
- Initiale Access-Helper-Implementierung darf intern noch `created_by` pruefen, muss aber spaeter `project_members` und `organization_members` beruecksichtigen koennen.
- UI-Aenderungen muessen zum bestehenden UI/UX-System passen: keine neuen Marketing-Layouts, keine unpassenden Komponenten, keine ungeprueften Responsiveness- oder Accessibility-Regressions.

## Done-Report-Vertrag

Beim Abschluss jedes Tickets muss ein Done Report in `docs/scriptony-architecture-refactor 25.04.26.md` geschrieben werden.

Format:

```md
## Phase X - <Bereich>

### Done Report: TXX - <Ticket-Titel>

- Date: YYYY-MM-DD HH:mm CEST
- Verification Marker: ARCH-REF-TXX-DONE
- Changed files:
- Appwrite collections:
- Appwrite buckets:
- Env vars:
- Routes:
- UI/UX checks:
- Tests run:
- Shimwrappercheck command:
- Shimwrappercheck result:
- AI Review result:
- Known risks:
- Rollback plan:
- Notes:
```

Wenn die passende Phase im Done-Report-Dokument noch fehlt, wird sie beim Abschluss des Tickets angelegt.

## Pflicht-Checks

Alle Implementierungstickets muessen ueber den Shim laufen. AI Review darf nicht deaktiviert werden. Die genaue Check-Matrix steht zusaetzlich in `docs/scriptony-architecture-refactor 25.04.26.md`.

Standard-Gate fuer normale Tickets:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Wenn unrelated User-Aenderungen im Worktree liegen, muss der Ticket-Scope explizit gesetzt werden:

```bash
SHIM_CHANGED_FILES="path/a.ts,path/b.md" CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Alternativ kann `SHIM_CHANGED_FILES_FILE` auf eine Datei mit einem Pfad pro Zeile zeigen. Der Scope gilt fuer Format/Lint/Function-Build und wird an den AI Review als Diff-Datei durchgereicht.

Backend-only Gate, wenn sicher kein Frontend/UI betroffen ist:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend
```

Frontend-only Gate, wenn sicher keine Functions/Appwrite-Konfiguration betroffen sind:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend
```

Gate fuer grosse Refactor-Checkpoints:

```bash
CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor
```

Release-, Deploy-, Security- oder Dependency-Aenderungen muessen zusaetzlich `npm audit` ueber den Shim aktivieren:

```bash
SHIM_RUN_NPM_AUDIT=1 CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor
```

Bei reinen Dependency-/Tooling-Tickets kann alternativ ein enger Gate laufen:

```bash
SHIM_RUN_NPM_AUDIT=1 CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Wichtig: `CHECK_MODE=snippet` soll den aktuell geaenderten Code in den AI Review einbeziehen und vermeidet, dass unrelated Altlasten als Blocker fuer ein enges Ticket behandelt werden. Wenn der AI Review trotzdem fremde Altlasten meldet, muss der Done Report klar trennen zwischen `blocking for this ticket` und `pre-existing unrelated`. Bei jedem Ticket muss in den Akzeptanzkriterien dokumentiert sein, welcher dieser Shim-Befehle verbindlich ist.

Codex Usage Limits, CLI-Ausfaelle oder ein fehlendes `VERDICT: ACCEPT` zaehlen nicht als bestandener AI Review. In diesem Fall bleibt das Ticket offen und derselbe scoped Shimwrappercheck-Befehl muss spaeter erneut laufen.

## Ticket-Reihenfolge

| Ticket | Phase | Titel | Status | Abhaengigkeiten |
| --- | --- | --- | --- | --- |
| T00 | 0 | Echte Appwrite Deployments inventarisieren | **done** | keine |
| T01 | 1 | Backend Domain Map anlegen | **done** | T00 |
| T02 | 1 | Shimwrappercheck Refactor Gate klaeren | **done** | T01 |
| T03 | 2 | `scriptony-script` Schema planen und provisionieren | **done** | T01, T02 |
| T04 | 2 | `scriptony-script` Basis-API implementieren | **done** | T03 |
| T05 | 3 | `scriptony-assets` Schema planen und provisionieren | **done** | T01, T02 |
| T06 | 3 | `scriptony-assets` Upload-, Link- und Query-API implementieren | **done** | T05 |
| T07 | 4 | `scriptony-audio-story` als `scriptony-audio-production` abgrenzen | **done** | T01 |
| T08 | 5 | Audio Production Orchestration an Script, Audio, Assets und Jobs anbinden | **done** | T04, T06, T07 |
| T09 | 5 | `scriptony-audio` auf technische Audiofaehigkeiten begrenzen | todo | T06, T08 |
| T10 | 6 | `scriptony-image` bereinigen | todo | T01, T02 |
| T11 | 6 | `scriptony-assistant` bereinigen | todo | T01, T02 |
| T12 | 7 | `scriptony-editor-readmodel` bauen | todo | T04, T06, T08 |
| T13 | 8 | Timeline-Konsolidierung vorbereiten | todo | T04, T06, T12 |
| T14 | 9 | `scriptony-jobs` konsolidieren | todo | T02, T08 |
| T15 | 9 | `scriptony-media-worker` als Worker-Grenze einrichten | todo | T14 |
| T16 | 10 | Observability und Admin konsolidieren | todo | T01, T02 |
| T17 | 10 | Legacy markieren, pruefen und entfernen | todo | T16 |
| T18 | laufend | `_shared` Business-Logik kontrolliert herausziehen | todo | T01 |
| T19 | laufend | UI/UX und Frontend-Aufrufer je Phase pruefen | todo | alle Implementierungstickets |
| T20 | laufend | `scriptony-storage` Zielmodell und Provider Boundary vorbereiten | todo | T01, T05, T06 |
| T21 | laufend | `scriptony-collaboration` Zielmodell und Access-Helper vorbereiten | todo | T01, T03, T04 |

---

## T00: Echte Appwrite Deployments inventarisieren

### Kontext

Die lokale Repo-Struktur, `appwrite.json`, Deploy-Skripte und die tatsaechlichen Appwrite Deployments sind nicht deckungsgleich.

### Problem

Ohne echte Deployment-Inventur koennen neue Tickets falsche Entry Points, tote Functions oder unvollstaendige Env-Konfigurationen als aktiv behandeln.

### Loesung

Alle realen Appwrite Functions, Deployments, Entry Points, Runtimes, Env Vars, Domains und Health-Routen erfassen. Jede Function wird als `active`, `repo-only`, `deployed-only`, `legacy` oder `unclear` markiert.

### User Journey

Ein Entwickler startet einen Refactor und weiss vor der ersten Codeaenderung, welche Functions wirklich live sind und welche nur im Repo liegen.

### Akzeptanzkriterien

- `docs/appwrite-function-inventory.md` existiert.
- Jede aktuelle Repo-Function ist enthalten.
- Jede real deployte Appwrite Function ist enthalten.
- `appwrite.json` Abweichungen sind dokumentiert.
- Runtime, Entry Point, Domain, Env Vars und Health-Status sind pro Function dokumentiert.
- UI/UX: keine UI-Aenderung; bestehende UI wird nicht beruehrt.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Ergebnis, AI Review und unrelated Altlasten muessen im Done Report dokumentiert sein.

### Tests

- Appwrite Console oder CLI gegen echte Function-Liste pruefen.
- Health-Routen der erreichbaren Functions pruefen.
- `VITE_BACKEND_FUNCTION_DOMAIN_MAP` gegen Deployments vergleichen.
- Docs-only Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T00-DONE`

---

## T01: Backend Domain Map anlegen

### Kontext

Neue Features brauchen ab sofort eine verbindliche Ziel-Domain. Der aktuelle Code enthaelt gemischte Functions wie `scriptony-audio`, `scriptony-image`, `scriptony-assistant`, `scriptony-shots` und `scriptony-project-nodes`.

### Problem

Ohne Domain Map landen neue Features weiter in der bequemsten bestehenden Function statt in der fachlich richtigen Verantwortung.

### Loesung

`docs/backend-domain-map.md` anlegen. Das Dokument enthaelt pro aktueller Function Ziel-Function, Status, erlaubte Verantwortung, verbotene Verantwortung, owned/read Datenmodelle, externe Provider und Migrationsnotizen.

### User Journey

Ein Agent oder Entwickler bekommt ein neues Feature und kann in unter zehn Sekunden entscheiden, welche Function zustaendig ist.

### Akzeptanzkriterien

- Jede aktuelle Function aus `functions/` ist enthalten.
- Jede Ziel-Function aus der Zielarchitektur ist enthalten.
- Jede Function hat Status `keep`, `rename`, `split`, `merge`, `new`, `legacy` oder `unclear`.
- `scriptony-audio-story` ist als future `scriptony-audio-production` markiert.
- `scriptony-project-nodes` ist als future `scriptony-structure` markiert.
- `scriptony-shots` und `scriptony-clips` sind als future `scriptony-timeline` markiert.
- `jobs-handler` und `make-server-3b52693b` sind als `legacy` markiert.
- `scriptony-storage` ist als future Platform-Domain enthalten.
- `scriptony-collaboration` ist als future Platform-Domain enthalten.
- Bestehende Storage-/OAuth-Dateien unter `scriptony-auth` oder anderen Functions sind als future `scriptony-storage` markiert.
- Bestehende Organisations-/Mitgliedschaftslogik ist als current auth / future collaboration oder als zu pruefende Grenze markiert.
- Direct Project Sharing ohne Organisation ist als Zielanforderung dokumentiert.
- Access-Helper-Konzept ist dokumentiert.
- UI/UX: keine UI-Aenderung; Dokument erwaehnt, dass UI-Aenderungen pro Ticket gegen bestehende Designregeln geprueft werden.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Ergebnis, AI Review und unrelated Altlasten muessen im Done Report dokumentiert sein.

### Tests

- `rg --files functions` gegen Domain Map abgleichen.
- `rg "scriptony-" src functions scripts docs` gegen Domain Map abgleichen.
- Shimwrappercheck Gate fuer Docs: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`, sofern keine externen Appwrite-Zugaenge fehlen.

### Verifizierungsmarker

`ARCH-REF-T01-DONE`

---

## T02: Shimwrappercheck Refactor Gate klaeren

### Kontext

Die Refactor-Tickets verlangen alle Checks inklusive AI Review. Die aktuelle `.shimwrappercheckrc` enthaelt gleichzeitig `SHIM_RUN_AI_REVIEW=1` und `SHIM_CHECKS_ARGS="--no-ai-review --no-explanation-check"`.

### Problem

Wenn Future Agents unklar ist, welcher Check-Vertrag gilt, koennen AI Review oder Explanation Check versehentlich deaktiviert werden.

### Loesung

Pruefen und dokumentieren, wie Shimwrappercheck fuer Refactor-Phasen aufzurufen ist. Falls noetig, Config oder Runbook so anpassen, dass Refactor-Tickets AI Review standardmaessig einschliessen.

### User Journey

Ein Agent schliesst ein Ticket ab und kann eindeutig den korrekten Shim-Befehl ausfuehren, ohne AI Review unbeabsichtigt zu ueberspringen.

### Akzeptanzkriterien

- Der verbindliche Check-Befehl fuer normale Tickets ist dokumentiert.
- Der verbindliche Check-Befehl fuer grosse Refactor-Checkpoints ist dokumentiert.
- AI Review ist nicht durch Ticket-Anweisungen deaktiviert.
- Der Done Report muss AI-Review-Ergebnis und eventuell unrelated Altlasten getrennt nennen.
- UI/UX: keine UI-Aenderung.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; bei Gate-Aenderungen muss zusaetzlich dokumentiert sein, ob `CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor` erfolgreich war oder welche Altlasten getrennt wurden.

### Tests

- Dry-run oder echte Ausfuehrung eines engen Docs-/Config-Tickets mit AI Review, sofern lokal moeglich.
- Pruefen, dass `SKIP_AI_REVIEW` nicht gesetzt ist.
- Pruefen, dass `CHECK_MODE=snippet` fuer normale Tickets den geaenderten Diff betrachtet.

### Verifizierungsmarker

`ARCH-REF-T02-DONE`

---

## T03: `scriptony-script` Schema planen und provisionieren

### Kontext

Native View, Drehbuch, Serienskript, Hoerspielskript, Buchtext, Dialoge, Narration und Textbloecke haben aktuell keine eigene Backend-Source-of-Truth.

### Problem

Script-Text droht in `audio-story`, `shots`, `beats`, `assistant`, `stage` oder `project-nodes` zu landen. Das erzeugt doppelte Wahrheit.

### Loesung

Neue Collections `scripts` und `script_blocks` planen und provisionieren. `script_blocks` bekommt mindestens `revision` oder ein gleichwertiges Feld fuer spaetere konfliktarme Updates.

### User Journey

Ein Autor oeffnet ein Projekt und erwartet, dass geschriebener Inhalt unabhaengig von Audio, Timeline oder Stage verlaesslich gespeichert wird.

### Akzeptanzkriterien

- `scripts` Collection ist geplant und provisioniert.
- `script_blocks` Collection ist geplant und provisioniert.
- Indexe fuer `project_id`, `script_id`, `node_id`, `parent_id`, `order_index`, `speaker_character_id`, `type` sind definiert.
- Block-Typen sind dokumentiert: `scene_heading`, `action`, `dialogue`, `narration`, `sound_effect`, `stage_direction`, `chapter_text`, `paragraph`, `note`.
- Permission-Modell ist dokumentiert.
- Schema und Permissions beruecksichtigen zukuenftige Collaboration.
- `project_id` bleibt Pflichtfeld fuer Access Checks.
- Es wird dokumentiert, dass Zugriff ueber Access-Helper und nicht direkt ueber `created_by` laufen muss.
- Noch keine vollstaendige Collaboration-Implementierung erforderlich.
- Keine Audio-, Asset-, Timeline- oder Provider-Logik im Schema.
- UI/UX: keine UI-Aenderung; bestehende Native-View-UI bleibt unveraendert.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Appwrite-Schema-/Provisioning-Pruefung und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Provisioning lokal gegen Appwrite-Schema-Skripte pruefen oder dry-run dokumentieren.
- Collection/Attribute/Index-Existenz pruefen.
- Permission denied fuer fremdes Projekt als Testfall definieren.
- Dokumentation zu Access-Helper und Collaboration-Readiness ist vorhanden.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T03-DONE`

---

## T04: `scriptony-script` Basis-API implementieren

### Kontext

Nach dem Schema braucht die Native View eine eigene Function mit stabilen Basisrouten.

### Problem

Ohne API greifen Frontend und Workflows weiter auf falsche Modelle oder alte Textfelder zu.

### Loesung

Neue Function `scriptony-script` implementieren mit Script-CRUD, Block-CRUD, Reorder und Blocks-by-Node. Keine Migration bestehender Texte erzwingen.

### User Journey

Ein Autor erstellt ein Script, fuegt Dialog- und Narration-Bloecke hinzu, sortiert sie um und sieht beim erneuten Oeffnen denselben Stand.

### Akzeptanzkriterien

- `GET /scripts/by-project/:projectId` funktioniert.
- `POST /scripts`, `GET /scripts/:id`, `PATCH /scripts/:id`, `DELETE /scripts/:id` funktionieren.
- `GET /scripts/:id/blocks`, `POST /scripts/:id/blocks` funktionieren.
- `GET /script-blocks/:id`, `PATCH /script-blocks/:id`, `DELETE /script-blocks/:id` funktionieren.
- `POST /script-blocks/reorder` funktioniert.
- `GET /nodes/:nodeId/script-blocks` funktioniert.
- `speaker_character_id` wird gegen erlaubten Projektkontext validiert oder sauber nullable behandelt.
- `node_id` wird gegen erlaubten Projektkontext validiert.
- Projektzugriff wird ueber Access-Helper geprueft:
  - `canReadProject(userId, projectId)`
  - `canEditProject(userId, projectId)`
  - `canManageProject(userId, projectId)`
- Route-Handler duerfen nicht direkt `project.created_by` vergleichen.
- Initiale Access-Helper-Implementierung darf intern noch `created_by` pruefen.
- Access-Helper muss so geschnitten sein, dass spaeter `project_members` und `organization_members` ergaenzt werden koennen.
- UI/UX: falls UI angeschlossen wird, nutzt sie bestehende Editor-Komponenten, bestehende Typografie, bestehende Loading/Error/Empty States und bleibt keyboard-bedienbar.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; bei Frontend-Anschluss ist zusaetzlich der UI/UX-Check im Done Report zu dokumentieren.

### Tests

- Create script.
- Get script by project.
- Create block.
- Patch block mit Revision/Concurrency-Verhalten.
- Delete block.
- Reorder blocks.
- Get blocks by node.
- Permission denied fuer fremdes Projekt.
- Invalid `node_id` rejected.
- Invalid `speaker_character_id` rejected oder nullable dokumentiert.
- `canReadProject` wird fuer Lese-Routen verwendet.
- `canEditProject` wird fuer Schreib-Routen verwendet.
- Direct `created_by` Checks in `scriptony-script` Route-Handlern kommen nicht vor.
- Permission denied fuer fremdes Projekt funktioniert weiterhin.
- UI Smoke, falls Frontend-Aufrufer geaendert werden.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T04-DONE`

---

## T05: `scriptony-assets` Schema planen und provisionieren

### Kontext

Uploads und Datei-Metadaten sind heute ueber mehrere Functions verteilt.

### Problem

Project-Cover, Shot-Images, Shot-Audio, World-Images, Stage-Dokumente und Styleguide-Referenzen duplizieren Upload-, Storage- und Metadatenlogik.

### Loesung

Neue Collection `assets` planen und provisionieren. Eine erlaubte Matrix fuer `owner_type`, `media_type` und `purpose` verhindert, dass `assets` zur unkontrollierten Ablage wird.

### User Journey

Ein Nutzer laedt eine Datei hoch und kann sie eindeutig einem Projekt, Shot, Script Block, World Item oder Style Guide zuordnen.

### Akzeptanzkriterien

- `assets` Collection ist geplant und provisioniert.
- Felder sind definiert: `project_id`, `owner_type`, `owner_id`, `media_type`, `purpose`, `file_id`, `bucket_id`, `filename`, `mime_type`, `size`, `duration`, `width`, `height`, `status`, `metadata`, `created_by`, `created_at`, `updated_at`.
- Owner-/Purpose-Matrix ist dokumentiert.
- Schema trennt fachliche Asset-Metadaten von physischer Storage-Provider-Logik.
- Optionales Feld fuer Storage-Referenz ist erlaubt, OAuth/Token-Logik ist verboten.
- Die Beziehung zu future `scriptony-storage` ist dokumentiert.
- `project_id` bleibt Pflichtfeld fuer spaetere Collaboration-/Access-Checks.
- Bestehende Buckets werden nicht unkoordiniert ersetzt.
- Delete-Policy ist definiert: Metadata-only delete vs. Storage-file delete.
- UI/UX: keine UI-Aenderung; Upload-UX-Regeln werden fuer T06 festgelegt.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Appwrite-Schema-/Bucket-Pruefung und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Collection/Attribute/Index-Existenz pruefen.
- Bucket-Mapping fuer bestehende Buckets pruefen.
- Owner-/Purpose-Matrix mit validen und invaliden Beispielen testen.
- Permission-Modell dokumentieren und Testfaelle definieren.
- Dokumentation zur Storage-Abstraktion ist vorhanden.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T05-DONE`

---

## T06: `scriptony-assets` Upload-, Link- und Query-API implementieren

### Kontext

Nach dem Schema braucht Scriptony eine zentrale API fuer Uploads, Asset-Metadaten und Owner-Verknuepfungen.

### Problem

Neue Uploads wuerden sonst weiter in Projekt-, Shot-, Audio-, Worldbuilding- oder Styleguide-Functions landen.

### Loesung

Neue Function `scriptony-assets` mit Upload, Get, Patch, Delete, Link/Unlink, By Owner und By Project implementieren. Alte Upload-Routen bleiben zunaechst kompatibel.

### User Journey

Ein Nutzer setzt ein Projekt-Cover, haengt Audio an einen Shot oder speichert eine Styleguide-Referenz. Alle Faelle laufen ueber dasselbe Asset-Konzept.

### Akzeptanzkriterien

- `POST /assets/upload` funktioniert.
- `GET /assets/:id`, `PATCH /assets/:id`, `DELETE /assets/:id` funktionieren.
- `GET /assets/by-owner/:ownerType/:ownerId` funktioniert.
- `POST /assets/:id/link` und `/unlink` funktionieren.
- `GET /assets/by-project/:projectId` funktioniert.
- Upload-Logik nutzt einen Storage-Adapter oder eine Storage-Abstraktion.
- Initial darf der Adapter Appwrite Storage verwenden.
- Keine Google-Drive-/Dropbox-/OneDrive-OAuth-Logik in `scriptony-assets`.
- Keine Provider-Token-Logik in `scriptony-assets`.
- Physische Storage-Details wie external_file_id, provider-specific path und sync_status werden als future `scriptony-storage`-Verantwortung markiert, falls sie noch nicht implementiert sind.
- `scriptony-assets` speichert fachliche Asset-Metadaten und verweist hoechstens auf Storage-Referenzen.
- Mindestens Project Cover und Shot Audio koennen ueber Assets modelliert werden.
- Alte Upload-Routen werden nicht gebrochen.
- UI/UX: falls Upload UI geaendert wird, verwendet sie bestehende Button-, Dialog-, Toast-, Progress- und Error-Patterns; keine ueberlappenden Texte auf Mobile/Desktop.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Upload-Smoke, Appwrite Bucket/Permission-Checks und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Upload image asset.
- Upload audio asset.
- Upload document asset.
- Link asset to project.
- Link asset to shot.
- Link asset to script block.
- Get assets by owner.
- Get assets by project.
- Delete asset metadata nach definierter Policy.
- Permission denied fuer falsches Projekt.
- Upload nutzt Storage-Adapter.
- Asset-Metadaten werden unabhaengig vom physischen Provider gespeichert.
- Keine OAuth-/Provider-Token-Imports in `scriptony-assets`.
- Appwrite Storage funktioniert als initialer Adapter.
- UI smoke fuer betroffene Upload-Flows.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T06-DONE`

---

## T07: `scriptony-audio-story` als `scriptony-audio-production` abgrenzen

### Kontext

`scriptony-audio-story` enthaelt Sessions, Tracks, Voice Assignments, statische TTS Voices und Mixing-Stubs.

### Problem

Der Name und die Verantwortung sind unscharf. Technische Audiofaehigkeiten und Audio-Produktionsplanung koennen dadurch verwechselt werden.

### Loesung

Domain Map und Route-Dokumentation aktualisieren: `scriptony-audio-story` ist future `scriptony-audio-production`. Neue technische Audiofeatures sind dort verboten. Bestehende Routen werden als Compatibility Surface markiert.

### User Journey

Ein Entwickler weiss sofort: TTS/STT gehoert zu `scriptony-audio`; Voice Casting, Sessions und Track Planning gehoeren zu `scriptony-audio-production`.

### Akzeptanzkriterien

- Domain Map markiert `scriptony-audio-story` als future `scriptony-audio-production`.
- Erlaubte und verbotene Verantwortungen sind dokumentiert.
- `audio_sessions`, `scene_audio_tracks`, `character_voice_assignments` sind als owned Models der Audio-Production-Domaene markiert.
- `GET /voices/tts/voices` ist als zu migrierende technische Audio-Route markiert.
- `mixing`-Routen sind als Orchestration, nicht Engine, markiert.
- UI/UX: keine UI-Aenderung; bestehende Audio-Production-UI bleibt kompatibel.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Routen-Smoke und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Bestehende `sessions`, `tracks`, `voices`, `mixing` Routen smoke-testen, wenn erreichbar.
- Keine neue TTS/STT-Providerlogik in `audio-story` suchen.
- Appwrite Schema-Mismatch fuer `audio_sessions.project_id` dokumentieren.
- Shimwrappercheck Gate fuer Dokumentation/kleine Codeanpassungen: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T07-DONE`

---

## T08: Audio Production Orchestration an Script, Audio, Assets und Jobs anbinden

### Kontext

Audio Production soll aus Script Blocks Audio-Tracks erzeugen, Voice Assignments nutzen, TTS ueber `scriptony-audio` ausfuehren, Dateien ueber `scriptony-assets` speichern und Mix/Export als Job ausloesen.

### Problem

Aktuell sind Mixing/Export Fake-Antworten und Script ist nicht Source of Truth.

### Loesung

`scriptony-audio-production` Orchestration implementieren oder vorbereiten: `generate-from-script`, Preview Mix und Export erzeugen Jobs oder delegieren an eine Job-Facade. TTS-Execution bleibt in `scriptony-audio`. Job-Payloads speichern keine vollstaendigen Script-Inhalte als Inline-JSON; stattdessen wird ein Snapshot als Asset/externe Referenz abgelegt und im Job nur per `snapshot_id` verlinkt.

### User Journey

Ein Nutzer waehlt eine Szene, weist Stimmen zu, erzeugt Audio aus Dialogbloecken und startet einen Preview-Mix. Das Ergebnis ist nachvollziehbar und als Asset gespeichert.

### Akzeptanzkriterien

- `generate-from-script` liest `script_blocks`, kopiert sie nicht als Source of Truth.
- TTS wird ueber `scriptony-audio` oder dessen Service-Abstraktion ausgefuehrt.
- Generierte Dateien werden ueber `scriptony-assets` gespeichert oder verlinkt.
- Mix/Export erzeugt Jobstatus statt Fake-Ergebnis.
- Job Payload enthaelt eine Script-Revision **Referenz** (`script_id`, `revision`, `snapshot_id`), nicht den vollstaendigen Inhalt als Inline-JSON.
- Snapshot-Daten (z. B. serialisierte Script-Blocks fuer nachvollziehbare Wiedergabe) werden als separates Asset oder in einer eigenen `job_snapshots`-Collection gespeichert; das `jobs`-Dokument bleibt unter 100 KB Payload.
- Voice Discovery wird nicht lokal dupliziert.
- UI/UX: Audio-Production UI zeigt Loading, Job-Status, Fehler und leere Zustaende nach bestehenden Patterns; keine neuen ungeprueften Controls.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Job-/Route-Smokes, UI/UX-Pruefung und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Create audio session.
- Create scene audio track.
- Assign voice to character.
- Generate audio from script blocks.
- TTS call bleibt ausserhalb von Audio Production.
- Generated audio appears as asset.
- Preview mix creates job.
- Export creates job.
- Permission denied fuer falsches Projekt.
- Ein Export-Job mit >100 Script-Blocks erzeugt ein `jobs`-Dokument unter 100 KB; der Snapshot liegt als Asset oder externe Referenz.
- UI smoke fuer Jobstatus/Fehler, falls UI geaendert wird.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Architektur-Hinweis

Die `jobs`-Collection bleibt Control-Plane (Status, Referenzen, Timestamps). Die echten Arbeitsobjekte (Script-Inhalte, Audio, Renders) liegen in ihren eigenen Domains und werden ueber Assets oder Snapshot-Collections referenziert, nicht inline im Job-Dokument.

### Verifizierungsmarker

`ARCH-REF-T08-DONE`

---

## T09: `scriptony-audio` auf technische Audiofaehigkeiten begrenzen

### Kontext

`scriptony-audio` enthaelt heute TTS/STT und Shot-Audio-Asset-Routen.

### Problem

Shot-Audio-Verwaltung ist Asset-/Timeline-Kontext, keine technische Audiofaehigkeit.

### Loesung

TTS/STT stabil halten. Shot-Audio-Routen als Legacy markieren oder als Compatibility Wrapper ueber `scriptony-assets` fuehren.

### User Journey

Ein Nutzer kann weiter bestehende Shot-Audio-Flows nutzen, waehrend neue Uploads sauber ueber Assets laufen.

### Akzeptanzkriterien

- TTS funktioniert unveraendert.
- STT funktioniert unveraendert.
- Voice Discovery funktioniert ueber `scriptony-audio`.
- Shot-Audio-Routen sind als legacy/compat dokumentiert.
- Neue Shot-Audio-Uploads koennen ueber `scriptony-assets` abgebildet werden.
- `shot_audio` Schema-Mismatch ist dokumentiert.
- UI/UX: bestehende Shot-Audio UI bleibt nutzbar; neue Asset-basierte Upload UI folgt bestehendem Upload-/Toast-/Error-Design.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Legacy-Kompatibilitaet und AI Review muessen im Done Report dokumentiert sein.

### Tests

- TTS synthesize.
- STT transcribe.
- Voice list.
- Old shot audio route works if kept.
- New asset upload for shot audio works.
- No duplicate metadata conflict between `shot_audio` and `assets`.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T09-DONE`

---

## T10: `scriptony-image` bereinigen

### Kontext

`scriptony-image` enthaelt technische Bildtasks, aber auch AI Settings, Key Validation, Cover-Produktlogik und Stage Render Execution.

### Problem

Die Function hat mehrere Aenderungsgruende: AI Control, Image Capability und Stage Orchestration.

### Loesung

Technische Bildoperationen bleiben in `scriptony-image`. AI Settings und Key Validation gehen zu `scriptony-ai`. Stage Render Execution geht zu `scriptony-stage` oder `scriptony-media-worker`. Legacy-Routen bleiben zunaechst kompatibel.

### User Journey

Ein Nutzer kann weiterhin Bilder generieren oder Tasks ansehen. Admin-/Integrationssettings liegen konsistent bei AI Settings.

### Akzeptanzkriterien

- `drawtoai`, `segment`, image tasks und Task Status bleiben in `scriptony-image`.
- AI Key Validation ist nach `scriptony-ai` migriert oder als compat Route delegiert.
- Image Settings sind nach `scriptony-ai` migriert oder als compat Route delegiert.
- `execute-render` ist nicht mehr technische Bild-API-Logik, sondern Stage/Worker-Orchestration.
- Cover-Produktlogik ist fachlich eingeordnet.
- UI/UX: Integrations-UI und Image-UI behalten bestehende Patterns; keine doppelten Settings-Oberflaechen.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; betroffene Image-/AI-/Stage-Routen und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Image task create/list/get.
- Legacy image settings route works or returns dokumentierte Deprecation.
- AI settings route works via `scriptony-ai`.
- Execute render creates/updates correct stage/worker state.
- UI smoke fuer AI Integrations und Image Task UI.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T10-DONE`

---

## T11: `scriptony-assistant` bereinigen

### Kontext

`scriptony-assistant` enthaelt Chat, Conversations, Settings, Models, Validate-Key, Count Tokens, Gym Starter und MCP Tool Registry.

### Problem

Assistant ist eine Sammelstelle fuer KI-nahe Themen, obwohl AI Control, Gym und MCP eigene Plattform-/Produktdomaenen haben.

### Loesung

Assistant auf Chat Experience, Conversations, Messages, Prompt Handling, RAG Experience und assistant-spezifische Utilities begrenzen. AI Settings/Models/Validate-Key zu `scriptony-ai`, Gym Starter zu `scriptony-gym`, MCP Tool Registry zu `scriptony-mcp-appwrite`.

### User Journey

Ein Nutzer nutzt den Assistant Chat stabil weiter. Settings, Gym-Starter und MCP-Verhalten bleiben erreichbar, aber ueber die fachlich richtige API.

### Akzeptanzkriterien

- Chat funktioniert.
- Conversations und Messages funktionieren.
- RAG Sync funktioniert.
- AI Settings/Models/Validate-Key laufen ueber `scriptony-ai` oder delegierende Compat-Routen.
- Gym Starter laeuft ueber `scriptony-gym` oder delegierende Compat-Route.
- MCP Tool Registry ist bei `scriptony-mcp-appwrite` oder delegiert.
- UI/UX: Assistant UI bleibt unveraendert bedienbar; Settings UI zeigt keine widerspruechlichen Quellen.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Assistant-/AI-/Gym-/MCP-Smokes und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Assistant chat.
- Conversation create/list/messages.
- RAG sync.
- AI settings read/write via `scriptony-ai`.
- Gym starter via `scriptony-gym`.
- MCP tools via `scriptony-mcp-appwrite`.
- UI smoke fuer Assistant und Integrationsseite.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T11-DONE`

---

## T12: `scriptony-editor-readmodel` bauen

### Kontext

Der Editor braucht zusammengesetzte Daten. Der aktuelle `nodes/ultra-batch-load` erfuellt diesen Bedarf, liegt aber in der falschen Function.

### Problem

`scriptony-structure` darf nicht Characters, Shots, Clips, Assets, Script Blocks und Audio Tracks als Editor-State aggregieren.

### Loesung

Neue read-only Function `scriptony-editor-readmodel` mit `GET /editor/projects/:projectId/state`. Sie aggregiert Project, Structure, Characters, Script Blocks, Shots, Clips, Assets, Scene Audio Tracks und Style Summary. Falls die Aggregation bei grossen Projekten zu langsam wird, unterstuetzt sie einen `lite`-Modus (nur Meta/Struktur) neben `full`, und die Langfriststrategie ist ein gecachter Snapshot (Redis, `project_editor_snapshots`-Collection oder aehnlich).

### User Journey

Ein Nutzer oeffnet den Editor und bekommt schnell einen vollstaendigen Ladezustand, ohne dass Schreiblogik in der Aggregation steckt.

### Akzeptanzkriterien

- `GET /editor/projects/:projectId/state` funktioniert.
- Function ist read-only.
- Keine `createDocument`, `updateDocument`, `deleteDocument` oder Storage Writes in der Function.
- Keine Provider Calls.
- Keine Job-Erstellung.
- Permissions werden fuer alle gelesenen Daten respektiert.
- `ultra-batch-load` wird nicht mehr erweitert.
- Response-Zeit fuer Projekte mit >100 Nodes/Shots wird gemessen. Ueberschreitet sie 10 Sekunden, wird im Done Report dokumentiert, dass dieses Readmodel **V1** ist und durch eine Async-Strategie (Snapshot/Cache) ersetzt werden muss.
- Ein optionaler `lite`-Query-Parameter ist dokumentiert: `lite` liefert nur Meta/Struktur, `full` liefert Assets/Tracks.
- Die JSON-Antwortgroesse wird ueberwacht; grossen Response-Streaming oder Chunking sind als Fallback dokumentiert.
- UI/UX: Editor Loading, Empty States und Fehler nutzen bestehende Patterns; keine Layoutverschiebungen auf Desktop/Mobile.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Editor-Smoke, Read-only-Pruefung und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Empty project.
- Small project.
- Large project.
- Permission denied.
- Response enthaelt erwartete Bereiche.
- No mutation side effects.
- Performance-Messung gegen bisherigen Editor Load.
- Performance-Test mit einem „grossen Projekt“ (mind. 100 timeline_nodes, 200 shots, 50 clips, 100 script_blocks, 50 assets). Falls der Test fehlschlaegt, wird im Done Report ein Migrationspfad zu einem gecachten Snapshot dokumentiert.
- UI smoke fuer Editor-Start.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Architektur-Hinweis

`scriptony-editor-readmodel` ist explizit als **read-only View-Model V1** dokumentiert. Es darf niemals Schreiblogik enthalten und ist kein Ersatz fuer eine spaetere Such-/Analytics-Ebene. Bei Skalierungsproblemen ist der Wechsel auf einen gecachten Snapshot (Redis oder `project_editor_snapshots`) die bevorzugte Fortsetzung.

### Verifizierungsmarker

`ARCH-REF-T12-DONE`

---

## T13: Timeline-Konsolidierung vorbereiten

### Kontext

Timeline-nahe Daten liegen aktuell in `shots`, `clips`, `scene_audio_tracks` und `shot_audio`.

### Problem

Eine zu fruehe generische `timeline_items` Collection kann zur unklaren Metadatenhalde werden. Gleichzeitig brauchen Shots, Clips, Timing, Playback und Readalong klare Ownership.

### Loesung

`scriptony-shots` und `scriptony-clips` als Timeline-Domaene markieren, bestehende Routen stabil halten und erst nach Script/Assets/Audio Production entscheiden, ob `timeline_items` noetig ist.

### User Journey

Ein Nutzer kann Shots und Clips weiter bedienen, waehrend die technische Ownership schrittweise klarer wird.

### Akzeptanzkriterien

- Domain Map markiert Shots/Clips als Timeline-Domaene.
- Keine neuen Timeline-Features in `scriptony-shots` ohne Zielentscheidung.
- `timeline_items` Entscheidung ist dokumentiert: `not needed yet`, `needed`, oder `needs review`.
- Beziehungen zu `script_blocks`, `assets` und `scene_audio_tracks` sind beschrieben.
- UI/UX: Timeline View bleibt stabil; keine neuen Timeline Controls ohne bestehende Interaktionsmuster.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Timeline-Smokes und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Shot CRUD.
- Shot reorder.
- Clip CRUD.
- Clip timing.
- Existing timeline UI smoke.
- Readalong/Audio relation testfaelle definieren, falls noch nicht implementiert.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T13-DONE`

---

## T14: `scriptony-jobs` konsolidieren

### Kontext

Es gibt `scriptony-jobs-handler` und `jobs-handler` mit aehnlicher Verantwortung, aber unterschiedlichen Implementierungen und Feldnamen.

### Problem

Doppeltes Job-System erzeugt uneindeutige Statusmodelle und erhoeht das Risiko bei Worker-Integration.

### Loesung

`scriptony-jobs-handler` als Basis pruefen, Ziel-Function `scriptony-jobs` definieren, `jobs-handler` als legacy markieren und ein einheitliches Job-Schema plus Compatibility-Strategie festlegen.

### User Journey

Ein Nutzer startet einen Export oder Renderjob und sieht einen eindeutigen Status, unabhaengig davon, welcher Worker ausfuehrt.

### Akzeptanzkriterien

- Nur eine Ziel-Job-Control-Plane ist dokumentiert.
- Jobstatus-Felder sind eindeutig.
- Retry, Cancel, Cleanup und Result-Struktur sind definiert.
- `jobs-handler` ist `LEGACY_DO_NOT_EXTEND`.
- Alte Routen sind kompatibel oder sauber deprecated.
- UI/UX: Jobstatus-UI nutzt bestehende Progress-, Toast- und Error-Patterns.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Job-Kompatibilitaet, Worker-Anbindung und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Create job.
- Get status.
- Get result.
- Fail job.
- Retry job, falls implementiert.
- Cancel job, falls implementiert.
- Cleanup job.
- Old route compatibility oder documented deprecation.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T14-DONE`

---

## T15: `scriptony-media-worker` als Worker-Grenze einrichten

### Kontext

Schwere Medienjobs wie Mixing, Rendering, Export, Palette Extraction, Normalization und Conversion duerfen nicht in user-facing CRUD-Functions versteckt werden.

### Problem

Ohne klare Worker-Grenze landen lange Jobs in `image`, `audio-production`, `style-guide` oder `stage` und verursachen Timeouts sowie unklare Verantwortungen.

### Loesung

`scriptony-media-worker` als Worker-Abstraktion definieren. Der HTTP-Entrypoint/API ist eine Appwrite Function, die aber **keine** schwere Medienverarbeitung (FFmpeg, Mixing, Rendering, Conversion) im eigenen Prozess ausfuehrt. Stattdessen validiert sie Payload, erstellt einen Job in `scriptony-jobs` und delegiert die Ausfuehrung sofort an einen externen Worker/Queue-Prozess. Langfristig wird der externe Worker unabhaengig von Appwrite Functions laufen (Container/Queue).

### User Journey

Ein Nutzer startet einen Export. Die UI bekommt sofort einen Jobstatus, waehrend der Worker die schwere Ausfuehrung uebernimmt.

### Akzeptanzkriterien

- Worker-Verantwortung ist dokumentiert.
- `media-worker` verwaltet nicht selbst Job-Source-of-Truth.
- Worker kann Jobstatus ueber `scriptony-jobs` aktualisieren.
- Erste Actions sind definiert: mix audio, export audio production, render video, execute image render, extract palette, export style guide, normalize audio, convert file.
- Keine Produktentscheidungen im Worker.
- Die Function fuehrt keine Media-Verarbeitung (FFmpeg, Bild-Merge, Audio-Mix, Video-Render) im eigenen Prozess aus.
- Die Function gibt nach maximal 5 Sekunden einen `jobId` als Async-Response zurueck, ohne auf das Worker-Ergebnis zu warten.
- Die Uebergabe an spaetere externe Queue-Worker (Redis/Bull/eigener Container) ist dokumentiert, so dass keine Business-Logik an das „Appwrite Function bleibt Worker“-Pattern gebunden wird.
- UI/UX: user-facing Status bleibt ueber Workflow-/Job-UI, nicht ueber Worker-UI.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Worker-Build, Jobstatus-Smoke und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Worker action receives job payload.
- Worker updates job status.
- Worker failure updates job error.
- Idempotency fuer wiederholte Trigger.
- Timeout-/Retry-Verhalten dokumentiert.
- Ein Mix-/Render-Job wird getriggert; die Function returned sofort einen Job-Status. Die tatsaechliche Ausfuehrung erfolgt initial in einem separaten Prozess oder ueber eine Queue.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T15-DONE`

---

## T16: Observability und Admin konsolidieren

### Kontext

Stats, Logs und Superadmin liegen in getrennten, teils unklar verdrahteten Route-Dateien.

### Problem

Read-only Observability und Admin haben unterschiedliche Security- und Ownership-Kontexte, sind aber aktuell nicht sauber als Ziel-Functions gefuehrt.

### Loesung

`scriptony-stats` und `scriptony-logs` zu future `scriptony-observability` zusammenfuehren. `scriptony-superadmin` zu future `scriptony-admin` umbenennen oder klar mappen. `scriptony-observability` beschraenkt sich auf strukturierte Listen und einfache Filter; komplexe Analytics, Billing-Reports und Kosten-Aggregationen ueber mehrere Collections/Zeitfenster sind explizit out-of-scope und spaeter ein separates System (Analytics/BI).

### User Journey

Ein Admin sieht globale Kennzahlen und Logs aus einer klaren Admin-/Observability-Oberflaeche, ohne Produktdaten versehentlich zu veraendern.

### Akzeptanzkriterien

- Observability ist read-only.
- Admin hat eigenen Security-Kontext.
- Top-Level Entrypoint-Status fuer `stats`, `logs`, `superadmin` ist geklaert.
- Routen sind in Domain Map und Deployment-Inventar dokumentiert.
- Keine Business Writes in Observability.
- Observability fuehrt keine Aggregationen ueber mehr als zwei Collections gleichzeitig durch.
- Komplexe Cross-Project-Billing-Stats, Kosten-Reports oder Nutzungs-Aggregationen ueber Zeitfenster sind als `future/separates System` markiert und nicht Teil dieses Tickets.
- UI/UX: Admin-/Stats-Views behalten bestehende Tabellen-, Empty-, Loading- und Error-Patterns.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Admin-/Observability-Smokes und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Project stats.
- Node stats.
- Project logs.
- Node logs.
- Superadmin users.
- Superadmin orgs.
- Superadmin stats.
- Permission denied fuer Nicht-Admin.
- Admin-Call fuer Projekt-Stats returned in <2 Sekunden fuer ein Projekt mit <10.000 Log-Eintraegen. Langsame Abfragen werden nicht durch Erhoehung der Query-Tiefe „optimiert“, sondern als Out-of-Scope markiert.
- UI smoke fuer Stats/Logs/Admin Views.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T16-DONE`

---

## T17: Legacy markieren, pruefen und entfernen

### Kontext

`jobs-handler`, `make-server-3b52693b` und mehrere unverdrahtete Route-Dateien sind Altlasten oder unklar aktiv.

### Problem

Legacy-Code zieht neue Agents an und kann versehentlich erweitert werden.

### Loesung

Legacy-Flows als `LEGACY_DO_NOT_EXTEND` markieren, Deploy-Status pruefen, Frontend-Verwendung suchen, Logs pruefen und erst nach Beobachtungsfenster entfernen oder archivieren.

### User Journey

Ein Entwickler weiss, dass Legacy-Dateien nicht fuer neue Features genutzt werden duerfen und findet den kompatiblen Ersatz.

### Akzeptanzkriterien

- `jobs-handler` ist legacy markiert.
- `make-server-3b52693b` ist legacy markiert.
- Unwired auth storage/demo routes sind geklaert.
- Unwired worldbuilding routes sind geklaert.
- Unwired shot character routes sind geklaert.
- Vor Entfernung wurden Deployments, Frontend-Aufrufer und Logs geprueft.
- UI/UX: keine sichtbaren Routen verschwinden ohne Kompatibilitaet oder dokumentierte Migration.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Legacy-Kompatibilitaet, Deploy-/Log-Pruefung und AI Review muessen im Done Report dokumentiert sein.

### Tests

- `rg` nach Function- und Route-Namen.
- Appwrite Deployments pruefen.
- Execution Logs pruefen.
- Frontend route usage pruefen.
- Compatibility smoke fuer betroffene alte Routen.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T17-DONE`

---

## T18: `_shared` Business-Logik kontrolliert herausziehen

### Kontext

`_shared` enthaelt neben Infrastruktur auch fachliche Logik, z. B. Timeline Mapping, Project Hydration und Observability.

### Problem

Wenn Business-Logik in `_shared` liegt, wird die Ownership unscharf. Wenn sie zu hart herausgezogen wird, entsteht aber Query-Duplizierung.

### Loesung

Schrittweise trennen: primitive Helpers bleiben in `_shared`; fachliche Orchestration wandert in Ziel-Functions; wiederverwendbare Leselogik wird als kleine Domain-Access-Adapter dokumentiert.

### User Journey

Ein Entwickler findet fachliche Regeln in der passenden Domaene und primitive Infrastruktur weiterhin zentral.

### Akzeptanzkriterien

- `_shared/auth`, `_shared/http`, `_shared/db`, `_shared/storage` bleiben primitive Infrastruktur.
- `_shared/timeline.ts` ist Ziel fuer Extraction nach `structure`/`timeline` oder Domain-Access dokumentiert.
- `_shared/scriptony.ts` ist Ziel fuer Extraction nach `project/world access` dokumentiert.
- `_shared/observability.ts` ist Ziel fuer `scriptony-observability` dokumentiert.
- Keine neue Workflow-Orchestration in `_shared`.
- UI/UX: keine direkte UI-Aenderung.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Import-Graph, betroffene API-Smokes und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Import-Graph nach betroffenen Shared-Modulen pruefen.
- Keine zirkulaeren Abhaengigkeiten.
- Bestehende API-Smokes nach jeder Extraction.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T18-DONE`

---

## T19: UI/UX und Frontend-Aufrufer je Phase pruefen

### Kontext

Viele Backend-Routen werden direkt oder indirekt aus dem bestehenden Frontend genutzt. Refactor-Tickets duerfen die aktuelle UX nicht verschlechtern.

### Problem

Backend-Refactors koennen unbemerkt UI-Flows brechen, Loading States entfernen, Error Handling verschlechtern oder neue UI-Elemente inkonsistent einfuehren.

### Loesung

Bei jedem Ticket mit Frontend-Auswirkung wird vor Codeaenderung die Route-Verwendung gesucht und nach Umsetzung ein UI/UX-Check dokumentiert. Neue UI nutzt bestehende Komponenten, Icons, Dialoge, Toasts, Forms, Tables und Responsive Patterns.

### User Journey

Ein Nutzer merkt vom Architekturumbau nichts ausser stabileren und konsistenteren Flows.

### Akzeptanzkriterien

- Frontend-Aufrufer sind fuer jede geaenderte Route gesucht und dokumentiert.
- Loading, Error, Empty und Success States sind geprueft.
- Neue UI verwendet bestehende Designsystem-Konventionen.
- Icon-Buttons haben Labels/Tooltips, sofern relevant.
- Keine Textueberlaeufe auf Mobile/Desktop.
- Keine neuen Roh-Fetches zu Appwrite in Komponenten.
- React Query/API-Layer-Konventionen bleiben eingehalten.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; bei UI-Aenderungen zusaetzlich `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend` oder ein dokumentierter Browser-/Screenshot-Smoke.

### Tests

- `rg` nach Route und Function-Namen in `src/`.
- Relevante Unit-/Component-Tests.
- Relevante Smoke-Flows.
- Browser-/Screenshot-Check fuer UI-aendernde Tickets.
- Accessibility sanity check fuer neue Controls.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T19-DONE`

---

## T20: `scriptony-storage` Zielmodell und Provider Boundary vorbereiten

### Kontext

Scriptony soll externe Storage Provider wie Google Drive per OAuth anbinden koennen. Dateien koennen je nach Storage Target in Appwrite Storage oder extern gespeichert werden.

### Problem

Storage/OAuth liegt historisch teilweise in `scriptony-auth` oder wuerde sonst in `scriptony-assets` landen. Das vermischt Identitaet, fachliche Asset-Metadaten und physische Dateiablage.

### Loesung

`scriptony-storage` als Platform-Domain definieren. Sie besitzt Storage Provider, Storage-OAuth, Storage Connections, Storage Targets, Storage Objects, Sync, Import und Export.

### User Journey

Ein Nutzer verbindet Google Drive als Storage Provider. Spaeter koennen Assets physisch dort gespeichert werden, ohne dass `scriptony-assets` OAuth oder Providerdetails kennen muss.

### Akzeptanzkriterien

- `scriptony-storage` ist in `docs/backend-domain-map.md` enthalten.
- `scriptony-storage` ist in der Zielarchitektur unter Platform enthalten.
- Bestehende Storage-/OAuth-Dateien aus `scriptony-auth` sind als future `scriptony-storage` markiert.
- Datenmodelle sind geplant:
  - `storage_connections`
  - `storage_targets`
  - `storage_objects`
- Google Drive OAuth ist als Storage-Provider-OAuth eingeordnet, nicht als Auth-Login.
- `scriptony-assets` bleibt fachliche Asset-Domaene.
- `scriptony-storage` bleibt physische Storage-Domaene.
- Bestehende Appwrite Buckets bleiben kompatibel.
- Storage-Adapter-Konzept fuer `scriptony-assets` ist dokumentiert.
- UI/UX: keine UI-Aenderung.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Ergebnis, AI Review und unrelated Altlasten muessen im Done Report dokumentiert sein.

### Tests

- `rg` nach Storage-/OAuth-Dateien in `functions/scriptony-auth`, `functions`, `src`.
- Bestehende Storage Provider/OAuth-Routen inventarisieren.
- Appwrite Buckets dokumentieren.
- Domain Map aktualisiert.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T20-DONE`

---

## T21: `scriptony-collaboration` Zielmodell und Access-Helper vorbereiten

### Kontext

Scriptony soll spaeter direkte Projektfreigaben und optional Organisationen/Workspaces unterstuetzen.

### Problem

Projektzugriff nur ueber `created_by` ist single-user-zentriert. Organisationen allein waeren zu schwergewichtig, weil Nutzer Projekte auch direkt mit einzelnen anderen Nutzern teilen koennen muessen.

### Loesung

`scriptony-collaboration` als Platform-Domain definieren. Direkte Projektfreigabe ohne Organisation ist Pflicht. Organisationen sind optionaler Owner-Kontext.

### User Journey

Ein Nutzer kann ein Projekt direkt mit einer anderen Person teilen, ohne vorher eine Organisation zu erstellen. Teams und Firmen koennen spaeter Organisationen/Workspaces verwenden.

### Akzeptanzkriterien

- `scriptony-collaboration` ist in `docs/backend-domain-map.md` enthalten.
- `scriptony-collaboration` ist in der Zielarchitektur unter Platform enthalten.
- Datenmodelle sind geplant:
  - `project_members`
  - `project_invites`
  - `organization_members`
  - `organization_invites`
- `projects.owner_type = user | organization` ist als Zielmodell dokumentiert.
- Direct Project Sharing ohne Organisation ist dokumentiert.
- Organisationen/Workspaces sind optionaler Owner-Kontext.
- Access-Helper sind definiert:
  - `canReadProject(userId, projectId)`
  - `canEditProject(userId, projectId)`
  - `canManageProject(userId, projectId)`
- Neue Functions muessen diese Access-Helper nutzen.
- Initiale Implementierung darf intern noch `created_by` pruefen.
- Future Implementation muss `project_members` und `organization_members` beruecksichtigen koennen.
- Bestehende Organisations-/Mitgliedschaftslogik aus `scriptony-auth` ist als current/future boundary dokumentiert.
- UI/UX: keine UI-Aenderung.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Ergebnis, AI Review und unrelated Altlasten muessen im Done Report dokumentiert sein.

### Tests

- `rg` nach `created_by`, `organization_members`, `organizations`, `project_members`, `invites`.
- Bestehende Auth-/Org-Routen inventarisieren.
- Access-Helper-Konzept dokumentieren.
- Domain Map aktualisiert.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T21-DONE`
