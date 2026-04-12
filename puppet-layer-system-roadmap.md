# Puppet-Layer-System Roadmap

Stand: 12. April 2026

Diese Roadmap basiert auf dem aktuellen Code- und Deploy-Stand in diesem Repo sowie auf den Tickets in [puppet-layer-system-tickets.md](./puppet-layer-system-tickets.md).

## Zielbild

Das Puppet-Layer-System sollte in 3 sauberen Schichten aufgebaut werden:

1. Persistenz und kanonische Contracts
2. Orchestrierung und Statusmodell
3. UI, externe Tools und Automatisierung

Wichtig ist die Reihenfolge: Erst wenn die Backend-Contracts stabil sind, lohnt sich die vollständige Frontend-Integration und erst danach Bridge/Blender.

## Aktueller Status

- Ticket 1: erledigt
- Ticket 2: teilweise
- Ticket 3: offen
- Ticket 4: teilweise
- Ticket 5: teilweise
- Ticket 6: teilweise
- Ticket 7: offen
- Ticket 8: teilweise
- Ticket 9: offen
- Ticket 10: offen
- Ticket 11: offen
- Ticket 12: teilweise

## Prioritätslogik

Die eigentlichen Blocker sind nicht 3D oder Blender, sondern:

- fehlender offizieller Render-Job-Lifecycle
- fehlender offizieller Style-Profile-Service
- fehlende kanonische Stage2D- und Sync-Endpoints
- fehlende Freshness-Logik

Deshalb sollte die Umsetzung nicht nach UI-Fläche, sondern nach Abhängigkeiten erfolgen.

## Empfohlene Reihenfolge

### Phase 0: abgeschlossen

#### Ticket 1: Database Schema

Status: erledigt

Warum abgeschlossen:

- neue Collections sind live angelegt
- `shots` wurde erweitert
- Deploy- und Smoke-Test-Skripte im Ticket-Ordner funktionieren

Hinweis:

- Der Produktcode nutzt die neuen Collections noch nicht konsequent. Das ist kein Schema-Problem mehr, sondern Folgearbeit in den Tickets 2 bis 12.

### Phase 1: Backend-Verträge stabilisieren

#### Ticket 2: `scriptony-ai` als echter Central Hub

Priorität: sehr hoch

Warum zuerst:

- Ticket 2 ist die Control-Plane für Provider, Routing und interne Weiterleitung
- solange hier die offiziellen Puppet-Layer-Routen fehlen, bauen andere Tickets auf provisorischen Pfaden

Was konkret fehlt:

- Weiterleitung für `/ai/style/*`
- Weiterleitung für `/ai/stage/*`
- Weiterleitung für `/ai/sync/*`
- Weiterleitung für `/ai/stage2d/*`
- Weiterleitung für `/ai/stage3d/*`
- optional interner `/ai/route-request`-Mechanismus nur dann, wenn wirklich gebraucht

Definition of done:

- `api-gateway` kennt alle geplanten Puppet-Layer-Surfaces
- `scriptony-ai` ist nur noch Control-Plane und delegiert sauber
- keine neue Puppet-Layer-Logik wird mehr unter Legacy-Routen versteckt

#### Ticket 6: `scriptony-style`

Priorität: sehr hoch

Warum hier:

- der offizielle Render-Flow braucht eine saubere Style-Quelle
- `styleProfiles` existiert bereits im Schema, wird aber noch nicht produktiv verwendet

Was konkret gebaut werden sollte:

- `GET /style/profiles`
- `POST /style/profiles`
- `GET /style/profiles/:id`
- `PUT /style/profiles/:id`
- `DELETE /style/profiles/:id`
- `POST /style/apply`
- `GET /style/shot/:shotId/profile`

Wichtige Architekturentscheidung:

- vorhandene `style-guide`-Logik nicht blind ersetzen
- stattdessen klar entscheiden, ob `style-guide` intern bleibt und `styleProfiles` das offizielle Puppet-Layer-Read-Model wird

Definition of done:

- `styleProfiles` wird wirklich beschrieben und gelesen
- ein Shot kann ein offizielles Style-Profil aufgelöst bekommen
- Frontend muss nicht mehr aus `project_visual_style` ableiten

#### Ticket 3: `scriptony-stage` Orchestrator

Priorität: sehr hoch

Warum jetzt:

- ohne Ticket 3 gibt es keinen offiziellen Review-/Accept-/Reject-Flow
- Ticket 12 hängt direkt daran
- Ticket 11 hängt logisch ebenfalls daran

Was konkret gebaut werden sollte:

- `POST /stage/render-jobs`
- `GET /stage/render-jobs/:id`
- `POST /stage/render-jobs/:id/complete`
- `PUT /stage/render-jobs/:id/accept`
- `PUT /stage/render-jobs/:id/reject`

Wichtige Regeln:

- `reviewStatus` lebt auf `renderJobs`
- nur `accept` verändert `acceptedRenderJobId` und `renderRevision`
- `reject` darf `acceptedRenderJobId` nicht überschreiben

Definition of done:

- offizieller Job-Datensatz in `renderJobs`
- Review-Entscheidung ist nachvollziehbar persistent
- Shot-Metadaten werden nur nach Ticket-Regeln verändert

### Phase 2: Produktionstaugliche Ausführung

#### Ticket 4: `scriptony-image`

Priorität: hoch

Warum nach Ticket 3:

- `execute-render` sollte von einem offiziellen Job aus gestartet werden
- erst Orchestrator, dann Renderer

Empfohlener Scope:

- Exploratory:
  - `POST /image/drawtoai`
  - `POST /image/segment`
  - `GET /image/tasks/:id`
- Official:
  - `POST /image/execute-render`

Wichtige Trennung:

- `imageTasks` für explorative Arbeit
- `renderJobs` für offiziellen Review-Flow

Definition of done:

- explorative Bildarbeit ist getrennt vom offiziellen Render-Flow
- `execute-render` meldet zuverlässig an `scriptony-stage` zurück

#### Ticket 5: `scriptony-stage2d`

Priorität: hoch

Warum hier:

- Stage2D existiert im Frontend bereits funktional
- es fehlt vor allem der saubere Backend-Vertrag

Was konkret gebaut werden sollte:

- `GET /stage2d/documents/:shotId`
- `PUT /stage2d/documents/:shotId`
- `POST /stage2d/layers`
- `PUT /stage2d/layers/:layerId`
- `DELETE /stage2d/layers/:layerId`
- `POST /stage2d/prepare-repair`

Architekturziel:

- bisherige Shot-Storage-Uploads in einen kanonischen Stage2D-Service überführen
- Frontend soll nicht mehr direkt mit Storage-/Shot-Sonderfällen arbeiten

Definition of done:

- Stage2D-Dokumente laufen über dedizierte Endpoints
- Layer-Operationen sind serverseitig modelliert
- `prepare-repair` liefert `maskFileId` und `guideBundleId`

### Phase 3: Frontend auf offizielle Semantik umstellen

#### Ticket 12: Frontend Integration

Priorität: hoch

Warum erst jetzt:

- Frontend kann die offizielle Review-Semantik erst stabil abbilden, wenn Tickets 3, 4, 5 und 6 stehen

Was konkret umgesetzt werden sollte:

- explorative Ergebnisse nur als Stage2D-Layer speichern
- offizielles `accept` und `reject` ausschließlich über `renderJobs`
- UI-Anzeigen für `pending`, `accepted`, `rejected`
- klare Trennung zwischen Entwurf und offiziellem Shot-Stand

Definition of done:

- Frontend verwendet keine impliziten Nebenwirkungen mehr
- `Apply` und `Accept` haben klar unterschiedliche Bedeutung
- Shot-Status entspricht exakt dem Backend-Modell

### Phase 4: Blender-Ingress und Freshness

#### Ticket 7: `scriptony-sync`

Priorität: mittel bis hoch

Warum nach Phase 3:

- Sync macht erst Sinn, wenn Stage, Style und Shot-Zustände stabil definiert sind

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

#### Ticket 11: Freshness Model

Priorität: mittel bis hoch

Warum direkt nach Ticket 7:

- die Regeln hängen an `guideBundleRevision`, `blenderSyncRevision`, `renderRevision`, `styleProfileRevision`, `lastPreviewAt`
- ohne `sync` fehlen dafür wichtige Inputs

Was konkret gebaut werden sollte:

- kanonische Helper zur Berechnung:
  - guides stale
  - render stale
  - preview stale
- zentrale Verwendung im Backend und im Frontend

Definition of done:

- kein dupliziertes Freshness-Raten im UI
- jeder Shot kann seinen Freshness-Status deterministisch berechnen

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

Wenn nur ein sinnvoller linearer Delivery-Pfad gewählt werden soll, ist diese Reihenfolge am saubersten:

1. Ticket 2 abschließen
2. Ticket 6 bauen
3. Ticket 3 bauen
4. Ticket 4 erweitern
5. Ticket 5 bauen
6. Ticket 12 auf offizielle Semantik umstellen
7. Ticket 7 bauen
8. Ticket 11 bauen
9. Ticket 8 bauen
10. Ticket 9 bauen
11. Ticket 10 bauen

## Empfohlene PR-Slices

Damit das nicht in einem Mammut-Branch endet, sollten die Tickets in kleine zusammenhängende PRs zerlegt werden:

### PR 1: Central Hub Routing

- Ticket 2
- nur Routing, Contracts, Gateway-Mapping

### PR 2: Style Profiles

- Ticket 6
- neue `styleProfiles`-Nutzung
- klarer Read-/Write-Pfad

### PR 3: Render Job Orchestrator

- Ticket 3
- `renderJobs`
- Accept/Reject/Complete

### PR 4: Image Execution Split

- Ticket 4
- `imageTasks` vs. `renderJobs`

### PR 5: Stage2D Service

- Ticket 5
- Migration vom ad-hoc Storage-Pfad zu echten Endpoints

### PR 6: Frontend Official Flow

- Ticket 12
- explorativ vs. offiziell

### PR 7: Blender Sync + Freshness

- Ticket 7
- Ticket 11

### PR 8: Stage3D View State

- Ticket 8

### PR 9: Local Bridge

- Ticket 9

### PR 10: Blender Addon

- Ticket 10

## Empfehlung

Wenn das Ziel eine belastbare V1 ist, sollte der Fokus zuerst auf Tickets 2, 3, 4, 5, 6 und 12 liegen. Damit entsteht ein vollständiger offizieller 2D-Render- und Review-Flow. Tickets 7, 11, 8, 9 und 10 sind danach die zweite Ausbaustufe für Blender-Integration, Freshness und 3D.
