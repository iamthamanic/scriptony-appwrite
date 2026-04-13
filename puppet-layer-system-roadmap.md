# Puppet-Layer-System Roadmap

Stand: 13. April 2026

Diese Roadmap basiert auf dem aktuellen Code- und Deploy-Stand in diesem Repo sowie auf den Tickets in [puppet-layer-system-tickets.md](./puppet-layer-system-tickets.md).

## Zielbild

Das Puppet-Layer-System sollte in 3 sauberen Schichten aufgebaut werden:

1. Persistenz und kanonische Contracts
2. Orchestrierung und Statusmodell
3. UI, externe Tools und Automatisierung

Wichtig ist die Reihenfolge: Erst wenn die Backend-Contracts stabil sind, lohnt sich die vollständige Frontend-Integration und erst danach Bridge/Blender.

## Aktueller Status

- Ticket 1: ✅ erledigt
- Ticket 2: ✅ erledigt (Gateway-Routing, /ai/route-request, /ai/assistant-Namespace, Legacy-Dispatch abgelöst)
- Ticket 3: ✅ erledigt (scriptony-stage: Render-Job-Lifecycle mit Accept/Reject/Complete)
- Ticket 4: ✅ erledigt (scriptony-image: imageTasks + execute-render)
- Ticket 5: ✅ erledigt (scriptony-stage2d: Document + Layer CRUD, prepare-repair)
- Ticket 6: ✅ erledigt (scriptony-style: CRUD + Apply + Shot-Resolution)
- Ticket 7: offen
- Ticket 8: teilweise (Placeholder)
- Ticket 9: offen
- Ticket 10: offen
- Ticket 11: offen
- Ticket 12: offen

## Prioritätslogik

Die eigentlichen Blocker sind nicht 3D oder Blender, sondern:

- fehlender offizieller Render-Job-Lifecycle → ✅ gelöst (Ticket 3)
- fehlender offizieller Style-Profile-Service → ✅ gelöst (Ticket 6)
- fehlende kanonische Stage2D- und Sync-Endpoints → teilweise gelöst (Stage2D ✅, Sync offen)
- fehlende Freshness-Logik → offen

Deshalb sollte die Umsetzung nicht nach UI-Fläche, sondern nach Abhängigkeiten erfolgen.

## Empfohlene Reihenfolge

### Phase 0: abgeschlossen ✅

#### Ticket 1: Database Schema

Status: ✅ erledigt

- neue Collections sind live angelegt
- `shots` wurde erweitert
- Deploy- und Smoke-Test-Skripte im Ticket-Ordner funktionieren

### Phase 1: Backend-Verträge stabilisieren ✅

#### Ticket 2: `scriptony-ai` als echter Central Hub

Status: ✅ erledigt

- `/ai/route-request` kennt alle Puppet-Layer-Surfaces
- Gateway-Routing für `/ai/style`, `/ai/stage`, `/ai/sync`, `/ai/stage2d`, `/ai/stage3d`
- Legacy-Dispatch abgelöst

#### Ticket 6: `scriptony-style`

Status: ✅ erledigt

- Vollständiger CRUD: `GET/POST /ai/style/profiles`, `GET/PUT/DELETE /ai/style/profiles/:id`
- `POST /ai/style/apply`, `GET /ai/style/shot/:shotId/profile`
- Zod-Schemas, Access-Control über Projekte/Orgs
- Deployed und live

#### Ticket 3: `scriptony-stage` Orchestrator

Status: ✅ erledigt

- `POST /stage/render-jobs`, `GET /stage/render-jobs/:id`
- `POST /stage/render-jobs/:id/complete`
- `PUT /stage/render-jobs/:id/accept` (setzt `acceptedRenderJobId` + `renderRevision++`)
- `PUT /stage/render-jobs/:id/reject` (`acceptedRenderJobId` bleibt unverändert)
- Deployed und live

### Phase 2: Produktionstaugliche Ausführung ✅

#### Ticket 4: `scriptony-image`

Status: ✅ erledigt

- Exploratory: `POST /image/drawtoai`, `POST /image/segment`, `GET /image/tasks/:id`
- Official: `POST /image/execute-render` (Callback an scriptony-stage)
- Trennung: `imageTasks` vs. `renderJobs`
- Deployed und live

#### Ticket 5: `scriptony-stage2d`

Status: ✅ erledigt

- `GET/PUT /stage2d/documents/:shotId` (get-or-create + update)
- `POST /stage2d/layers`, `PUT /stage2d/layers/:layerId`, `DELETE /stage2d/layers/:layerId?shotId=`
- `POST /stage2d/prepare-repair` (maskFileId + guideBundleId)
- Deployed und live

### Phase 3: Backend abschließen (Sync + Freshness)

**Begründung:** Bevor das Frontend auf die neuen Backend-Services umgestellt wird, sollten Sync und Freshness stehen. Sonst muss das Frontend zweimal angefasst werden — einmal ohne Sync/Freshness-Daten und einmal mit. Wenn Sync und Freshness zuerst fertig sind, kann Ticket 12 (Frontend) einmal sauber durchgezogen werden gegen das komplette Backend-Modell.

#### Ticket 7: `scriptony-sync`

Priorität: hoch

Warum jetzt (vor Frontend):

- Sync-Endpunkte liefern die Daten, die Freshness (Ticket 11) braucht
- Freshness-Helper im Frontend brauchen `blenderSyncRevision`, `lastBlenderSyncAt` etc. — ohne Sync sind diese Felder immer leer
- Wenn Sync zuerst steht, kann Ticket 12 alle Statusfelder korrekt darstellen, statt sie nachträglich zu ergänzen

Was konkret gebaut werden sollte:

- `POST /sync/shot-state`
- `POST /sync/guides`
- `POST /sync/preview`
- `POST /sync/glb-preview`

Wichtige Regel:

- `scriptony-sync` darf nur Sync-Metadaten ändern
- keine Produktentscheidung, kein `acceptedRenderJobId`, kein `reviewStatus`

Definition of done:

- Blender/Bridge können Zustände publizieren
- Review-Entscheidungen bleiben vollständig außerhalb von `sync`
- Alle Sync-Felder auf `shots` werden beschreibbar

#### Ticket 11: Freshness Model

Priorität: hoch

Warum direkt nach Ticket 7:

- die Regeln hängen an `guideBundleRevision`, `blenderSyncRevision`, `renderRevision`, `styleProfileRevision`, `lastPreviewAt`
- ohne `sync` fehlen dafür die Inputs
- Freshness-Helper werden sowohl im Backend (für Shot-Status) als auch im Frontend (für UI-Indikatoren) gebraucht

Was konkret gebaut werden sollte:

- kanonische Helper zur Berechnung:
  - guides stale: `guideBundleRevision < blenderSyncRevision`
  - render stale: `renderRevision < guideBundleRevision OR renderRevision < styleProfileRevision`
  - preview stale: `!lastPreviewAt OR !lastBlenderSyncAt OR lastPreviewAt < lastBlenderSyncAt`
- zentrale Verwendung im Backend und im Frontend

Definition of done:

- kein dupliziertes Freshness-Raten im UI
- jeder Shot kann seinen Freshness-Status deterministisch berechnen
- Helper sind als Shared-Modul für Backend und Frontend verfügbar

### Phase 4: Frontend auf offizielle Semantik umstellen

#### Ticket 12: Frontend Integration

Priorität: hoch

Warum erst nach Phase 3:

- Frontend kann jetzt gegen das **vollständige** Backend-Modell gebaut werden
- Sync- und Freshness-Daten sind vorhanden, sodass UI-Indikatoren sofort korrekt sind
- kein zweites Anfassen nötig — ein einziger Durchlauf reicht

Was konkret umgesetzt werden sollte:

- explorative Ergebnisse nur als Stage2D-Layer speichern
- offizielles `accept` und `reject` ausschließlich über `renderJobs`
- UI-Anzeigen für `pending`, `accepted`, `rejected`
- klare Trennung zwischen Entwurf und offiziellem Shot-Stand
- Freshness-Indikatoren (stale guides, stale render, stale preview) im UI

Definition of done:

- Frontend verwendet keine impliziten Nebenwirkungen mehr
- `Apply` und `Accept` haben klar unterschiedliche Bedeutung
- Shot-Status entspricht exakt dem Backend-Modell
- Freshness-Status wird zentral berechnet, nicht geraten

### Phase 5: 3D und lokale Tooling-Anbindung

#### Ticket 8: `scriptony-stage3d`

Priorität: mittel

Warum später:

- aktuell existiert nur ein Placeholder
- für V1 des Puppet-Layer-Systems ist 2D + Render-Review wichtiger als 3D-View-State

Was konkret gebaut werden sollte:

- `GET /stage3d/documents/:shotId`
- `PUT /stage3d/documents/:shotId/view-state`

Definition of done:

- 3D-View-State ist serverseitig adressierbar
- keine Authoring-Logik im Service

#### Ticket 9: Local Bridge

Priorität: mittel

Warum später:

- der Bridge-Daemon sollte auf stabilen Sync-/Stage-/Image-Verträgen aufsetzen

Was konkret gebaut werden sollte:

- Node.js-Daemon
- WebSocket/Appwrite- oder Polling-Verbindung
- HTTP zu ComfyUI
- HTTP zu Blender
- Callbacks zurück an Stage/Sync

Definition of done:

- Bridge trifft keine Produktentscheidungen
- Bridge ist rein Transport- und Integrationsschicht

#### Ticket 10: Blender Addon

Priorität: mittel

Warum nach Ticket 7 und 9:

- das Addon braucht stabile Sync-Endpunkte und ein klares Auth-Modell

Was konkret gebaut werden sollte:

- Shot Binding
- Sync Shot State
- Publish Preview
- Publish Guides
- API Key/Auth
- Statusanzeige

Definition of done:

- Addon publiziert Daten, entscheidet aber nichts
- alle produktrelevanten Entscheidungen bleiben im Backend

## Konkrete Reihenfolge für die Umsetzung

1. ~~Ticket 2 abschließen~~ ✅
2. ~~Ticket 6 bauen~~ ✅
3. ~~Ticket 3 bauen~~ ✅
4. ~~Ticket 4 erweitern~~ ✅
5. ~~Ticket 5 bauen~~ ✅
6. **Ticket 7 bauen** ← nächstes
7. **Ticket 11 bauen**
8. Ticket 12 auf offizielle Semantik umstellen
9. Ticket 8 bauen
10. Ticket 9 bauen
11. Ticket 10 bauen

## Empfohlene PR-Slices

### PR 1–5: Backend-Verträge und Orchestrierung ✅

- Ticket 2, 6, 3, 4, 5 — alle deployed und live

### PR 6: Blender Sync

- Ticket 7
- Sync-Endpunkte, Shot-Feld-Updates, strikte Trennung von Produktentscheidungen

### PR 7: Freshness Model

- Ticket 11
- Kanonische Helper, Shared-Modul für Backend + Frontend

### PR 8: Frontend Official Flow

- Ticket 12
- explorativ vs. offiziell, Freshness-Indikatoren, ein einziger Durchlauf gegen komplettes Backend

### PR 9: Stage3D View State

- Ticket 8

### PR 10: Local Bridge

- Ticket 9

### PR 11: Blender Addon

- Ticket 10

## Empfehlung

Phase 0–2 sind abgeschlossen. Das Backend-Modell für den 2D-Render- und Review-Flow steht.

**Nächster Schritt:** Ticket 7 (`scriptony-sync`) bauen, damit Sync- und Freshness-Daten verfügbar sind, bevor das Frontend umgestellt wird. Danach Ticket 11 (Freshness), dann Ticket 12 (Frontend) als ein einziger sauberer Durchlauf gegen das vollständige Backend.
