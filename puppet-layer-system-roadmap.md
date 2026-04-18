# Puppet-Layer-System Roadmap

Stand: 17. April 2026

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
- Ticket 7: ✅ erledigt (scriptony-sync: shot-state, guides, preview, glb-preview)
- Ticket 8: ✅ erledigt (scriptony-stage3d: GET/PUT view-state, Zod-Validierung, Optimistic Locking, 23 Tests)
- Ticket 9: ✅ erledigt (Local Bridge: Workflow-Resolver, Input-Resolver, DB-Direct Callbacks, WS+Polling, 29 Tests)
- Ticket 10: offen
- Ticket 11: ✅ erledigt (scriptony-sync: Freshness Model mit kanonischen Helpern + GET /sync/freshness/:shotId)
- Ticket 12: offen

## Prioritätslogik

Die eigentlichen Blocker sind nicht 3D oder Blender, sondern:

- fehlender offizieller Render-Job-Lifecycle → ✅ gelöst (Ticket 3)
- fehlender offizieller Style-Profile-Service → ✅ gelöst (Ticket 6)
- fehlende kanonische Stage2D- und Sync-Endpoints → ✅ gelöst (Stage2D ✅, Sync ✅)
- fehlende Freshness-Logik → offen (nächstes Ticket 11)

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

### Phase 3: Backend abschließen (Sync + Freshness) ✅

#### Ticket 7: `scriptony-sync`

Status: ✅ erledigt

- `POST /sync/shot-state` — Blender publiziert Version + Revision
- `POST /sync/guides` — Bridge publiziert Guide Bundle
- `POST /sync/preview` — Bridge publiziert 2D Preview
- `POST /sync/glb-preview` — Bridge publiziert GLB Preview
- Strenge Guard-Rule: keine Produktentscheidungen (`acceptedRenderJobId`, `renderRevision`, `reviewStatus`, `styleProfileRevision` sind forbidden)
- `guideBundleRevision` + `latestGuideBundleId` werden über `/sync/guides` gesetzt
- `blenderSyncRevision` + `lastBlenderSyncAt` werden über `/sync/shot-state` gesetzt
- `lastPreviewAt` wird über `/sync/preview` gesetzt
- `glbPreviewFileId` wird über `/sync/glb-preview` gesetzt
- Deploy-Script und npm-Skript (`npm run appwrite:deploy:sync`) vorhanden
- Esbuild-Bundle erfolgreich

**Begründung:** Sync liefert die Daten, die Freshness (Ticket 11) braucht. Ohne Sync sind `blenderSyncRevision`, `lastBlenderSyncAt` etc. immer leer. Jetzt da Sync steht, kann Ticket 11 alle Statusfelder korrekt berechnen.

#### Ticket 11: Freshness Model ✅

Priorität: hoch ✅ erledigt

Warum jetzt (direkt nach Ticket 7):

- die Regeln hängen an `guideBundleRevision`, `blenderSyncRevision`, `renderRevision`, `styleProfileRevision`, `lastPreviewAt`
- Sync (Ticket 7) liefert jetzt die Inputs
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

Priorität: hoch — offen

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

#### Ticket 8: `scriptony-stage3d` ✅

Status: ✅ erledigt

- `GET /stage3d/documents/:shotId` — get-or-create
- `PUT /stage3d/documents/:shotId/view-state` — optimistisches Locking (409 Conflict)
- Zod-Validierung (viewState: valides JSON, max 64 KB)
- Idempotentes getOrCreate (catch unique-constraint conflict)
- Auth-Gate + userCanAccessShot
- 23 Unit-Tests (alle grün)
- API-Gateway-Route: `/ai/stage3d` → `scriptony-stage3d`
- Deploy-Script vorhanden

#### Ticket 9: Local Bridge ✅

Status: ✅ erledigt

- Workflow-Resolver: JSON-Templates in `local-bridge/workflows/` (txt2img, img2img, inpaint)
- Input-Resolver: Guide-Bundle/Mask-Download aus Appwrite Storage + Upload zu ComfyUI
- DB-Direct Callbacks: Complete/Fail direkt via Appwrite SDK (kein HTTP, kein Auth-Token nötig)
- WS+Polling Race: ComfyUI WebSocket-Completion resolved aktiv Job-Promise, Polling als Fallback
- DB-Retry: Exponentieller Backoff bei transienten Fehlern (429, 503, ECONNRESET)
- Realtime-Reconnection: Exponential Backoff (5s→60s), isConnected() für Health-Endpoint
- Sync-Handler: DB-direct mit Forbidden-Field-Guard (gleiche Regeln wie scriptony-sync)
- Health-Server: Port 9877, Reports Appwrite Realtime + ComfyUI + Blender + Active Jobs
- Dockerfile + .env.example
- 29 Unit-Tests (alle grün), TypeCheck sauber, Build erfolgreich

#### Ticket 10: Blender Addon — erledigt

Priorität: mittel → erledigt

6-Dateien-Architektur (SOLID/DRY/KISS-hardened):

- `constants.py` — Single source of truth (Endpoints, Timeouts, Forbidden Fields)
- `api.py` — Cloud HTTP Client (Retry, Auth, Validation, Forbidden-Field Guard)
- `server.py` — Local HTTP Server (Port 9876, /health, /bridge/render-accepted|rejected)
- `__init__.py` — Manifest, Preferences (API-Key in UserPrefs, nicht in .blend), Health-Timer
- `operators.py` — 7 Blender Operators (bind, sync-state, preview, guides, glb, view-state, freshness)
- `ui.py` — 2 Panels (Main + Freshness), keine Produkt-Entscheidungen im UI

Hardening:
- API-Key in AddonPreferences (PASSWORD subtype) — landet nicht in .blend-Dateien
- Request-Timeout 10s, Exponential Backoff Retry (3x, 1s→30s)
- Client-seitiger Forbidden-Field Guard (mirrors server-side)
- Path-Traversal-Prevention in shotId
- Payload-Size-Limits (1MB, viewState 64KB)
- Thread-safe Event-Queue für Bridge-Notifications
- Periodic Health-Check (Blender Timer, 60s)
- Nur stdlib — kein pip, kein async

## Konkrete Reihenfolge für die Umsetzung

1. ~~Ticket 2 abschließen~~ ✅
2. ~~Ticket 6 bauen~~ ✅
3. ~~Ticket 3 bauen~~ ✅
4. ~~Ticket 4 erweitern~~ ✅
5. ~~Ticket 5 bauen~~ ✅
6. ~~Ticket 7 bauen~~ ✅
7. ~~Ticket 11 bauen~~ ✅
8. ~~Ticket 8 bauen~~ ✅
9. **Ticket 12** auf offizielle Semantik umstellen
10. ~~Ticket 9 bauen~~ ✅
11. Ticket 10 bauen

## Empfohlene PR-Slices

### PR 1–5: Backend-Verträge und Orchestrierung ✅

- Ticket 2, 6, 3, 4, 5 — alle deployed und live

### PR 6: Blender Sync ✅

- Ticket 7
- Sync-Endpunkte, Shot-Feld-Updates, strikte Trennung von Produktentscheidungen

### PR 7: Freshness Model

- Ticket 11
- Kanonische Helper, Shared-Modul für Backend + Frontend

### PR 8: Frontend Official Flow

- Ticket 12
- explorativ vs. offiziell, Freshness-Indikatoren, ein einziger Durchlauf gegen komplettes Backend

### PR 9: Stage3D View State ✅

- Ticket 8 — deployed und live

### PR 10: Local Bridge ✅

- Ticket 9 — workflow-resolver, input-resolver, DB-direct, 29 Tests

### PR 11: Blender Addon

- Ticket 10

## Empfehlung

Phase 0–3 + Tickets 8 und 9 sind abgeschlossen. Das Backend-Modell und die Bridge-Infrastruktur stehen vollständig.

**Nächster Schritt:** Ticket 12 (Frontend auf offizielle Semantik umstellen) oder Ticket 10 (Blender Addon). Das Backend und die lokale Bridge sind komplett.
