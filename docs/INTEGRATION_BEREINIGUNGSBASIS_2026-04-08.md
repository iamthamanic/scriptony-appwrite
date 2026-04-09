# Integrations-Bereinigungsbasis

Stand: 2026-04-08

Status: Operative Arbeitsgrundlage fuer Ticket 01 und Ticket 02 aus [docs/INTEGRATION_STABILISIERUNG_TICKETS.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/INTEGRATION_STABILISIERUNG_TICKETS.md)

## Zweck

Dieses Dokument konserviert den aktuellen Ist-Zustand des Repos und stellt die Branch-/Commit-Landkarte fuer die weitere Stabilisierung her. Es ist bewusst keine Loesungsskizze auf Code-Ebene, sondern die Entscheidungsbasis fuer die naechsten Bereinigungs- und Integrationsschritte.

## Ticket-Abdeckung

- Ticket 01:
  Workspace einfrieren und Ist-Zustand sichern
- Ticket 02:
  Branch- und Commit-Landkarte herstellen

## 1. Workspace-Snapshot

### 1.1 Aktueller Git-Zustand

- Aktueller Branch:
  `workspace-main-ai-20260406`
- Branch-Head:
  `722ba3a072cf68b37d7faa86f3146f83e94e13d6` `integrate central ai config on main`
- Referenz-Branches:
  `main` -> `b5089e23ee1b6cbdf059e3ebc522a090a9a828f9` `Improve timeline trim sync and add tests`
- Referenz-Branches:
  `feature/ai-service-refactor` -> `3597b3bb79b5e4cd15f1ab9872fd95b85feb387f` `feat: add STT/TTS endpoints to scriptony-audio`
- Paralleler lokaler Integrations-Branch:
  `integration-main-plus-ai-20260406` -> ebenfalls `722ba3a072cf68b37d7faa86f3146f83e94e13d6`
- Vorhandener Stash:
  `stash@{0}` `On feature/ai-service-refactor: pre-main-ai-integration-2026-04-06`

### 1.2 Dirty-Workspace-Umfang

Aktueller Working Tree ist nicht nur leicht veraendert, sondern in mehreren Architektur-Schichten gleichzeitig offen.

- `81` geaenderte Dateien im Working Tree laut `git diff --stat`
- `20` untracked Dateien laut `git status --short`
- `1361` Insertions und `246` Deletions im uncommitted Diff

Schwerpunktbereiche der offenen Aenderungen:

- `functions/_shared`: `11`
- `functions/scriptony-auth`: `10`
- `functions/scriptony-project-nodes`: `8`
- `functions/scriptony-shots`: `8`
- `src/lib`: `8`
- `functions/scriptony-worldbuilding`: `7`
- `functions/scriptony-ai`: `6`
- `functions/scriptony-assistant`: `6`
- `functions/scriptony-stats`: `6`
- `src/components`: `6`

### 1.3 Charakter der offenen Aenderungen

Die lokalen Aenderungen sind thematisch nicht homogen. Im selben Working Tree liegen gleichzeitig:

- AI-Service-Weiterentwicklung und neue Provider-/Feature-Logik
- Umbau der Function-Auth in `functions/_shared/auth.ts`
- neue Appwrite-native Function-Entrypoints in mehreren `functions/*/appwrite-entry.ts`
- Frontend-Transportwechsel in `src/lib/api-gateway.ts`
- lokale Anpassungen an Settings-, Debug- und UI-Pfaden
- Package- und Lockfile-Aenderungen in Root und `functions/`

### 1.4 Besonders risikoreiche uncommitted Stellen

- `src/lib/api-gateway.ts`
  enthielt vorher einen direkten HTTP-Fetch zum Function-Domain-Endpunkt und wurde lokal auf `Functions.createExecution(...)` erweitert
- `functions/_shared/auth.ts`
  traegt die zentrale Auth-Entscheidung fuer viele Handler
- `functions/_shared/env.ts`
  beeinflusst die Laufzeit- und Validierungsbasis fuer Function-Auth
- `functions/scriptony-projects/projects/index.ts`
  und `functions/scriptony-worldbuilding/worlds/index.ts`
  sind direkt von der aktuellen `401`-Regression betroffen
- mehrere neue `appwrite-entry.ts` Dateien
  deuten auf einen nicht vollstaendig ausgerollten Runtime-/Entrypoint-Umbau hin

## 2. Deployte Realitaet

### 2.1 Live-Functions mit produktionsrelevanter Rolle

| Function | Live | Deployment | Deployment-Datum (UTC) | Hinweise |
| --- | --- | --- | --- | --- |
| `scriptony-auth` | `true` | `69c30bbda32674b302f4` | `2026-03-24T22:10:05.688+00:00` | `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_PUBLIC_ENDPOINT` |
| `scriptony-projects` | `true` | `69c3ed2ba0cb4b168a69` | `2026-03-25T14:11:55.671+00:00` | `execute:any`, Timeout `60`, volle Appwrite-Variablen |
| `scriptony-shots` | `true` | `69c7b8d82f3a5f2b559d` | `2026-03-28T11:17:44.219+00:00` | volle Appwrite-Variablen |
| `scriptony-assistant` | `true` | `69ccf26be61617fd7d97` | `2026-04-01T10:24:43.949+00:00` | Runtime aktiv |
| `scriptony-image` | `true` | `69cd0bb786005845410d` | `2026-04-01T12:12:39.554+00:00` | Timeout `300`, keine sichtbaren Vars |
| `scriptony-project-nodes` | `true` | `69ce426d446d7d1279a6` | `2026-04-02T10:18:21.291+00:00` | volle Appwrite-Variablen |
| `scriptony-characters` | `true` | `69ce4271bedb1f505d0d` | `2026-04-02T10:18:25.789+00:00` | volle Appwrite-Variablen |
| `scriptony-worldbuilding` | `true` | `69cee36142af761bb878` | `2026-04-02T21:45:05.281+00:00` | volle Appwrite-Variablen |
| `scriptony-clips` | `true` | `69cf9752f3c231bc8730` | `2026-04-03T10:32:51.080+00:00` | Runtime aktiv |
| `scriptony-ai` | `true` | `69d3d1e034d2ed965301` | `2026-04-06T15:31:44.224+00:00` | nur `APPWRITE_API_KEY` sichtbar |

### 2.2 Aktiviert, aber nicht live oder nicht sauber deployt

Diese Funktionen erhoehen das Integrationsrisiko, weil ihr Repo-Code offen ist, die Runtime aber nicht sauber als live-deployed Gegenstueck vorliegt.

- `make-server-3b52693b`
  `enabled:true`, `live:false`, kein Deployment
- `scriptony-audio`
  `enabled:true`, `live:false`, kein Deployment
- `scriptony-logs`
  `enabled:true`, `live:false`, kein Deployment
- `scriptony-stats`
  `enabled:true`, `live:false`, kein Deployment
- `scriptony-superadmin`
  `enabled:true`, `live:false`, kein Deployment
- `scriptony-gym`
  `enabled:true`, `live:false`, kein Deployment
- `scriptony-timeline-v2`
  `enabled:true`, `live:false`, kein Deployment

Sonderfall:

- `scriptony-mcp-appwrite`
  `live:true`, aber ohne sichtbare Deployment-ID. Das sollte vor spaeteren Runtime-Entscheidungen separat geprueft werden.

### 2.3 Deploy-/Repo-Paritaet

Es gibt aktuell keine sichere 1:1-Paritaet zwischen:

- lokalem Working Tree
- Commit-Stand des aktuellen Branches
- tatsaechlich live deployten Functions

Die deployte Realitaet bildet vor allem den Stand bis `2026-04-06` ab. Der lokale Workspace enthaelt darueber hinaus uncommitted Integrationsarbeit, die in dieser Form nicht als deployte Referenz angenommen werden darf.

## 3. Bekannte Laufzeitbefunde

### 3.1 Aktuelle Regression

Symptom:

- `GET /projects` liefert lokal im aktuellen App-Zustand `401 Unauthorized`
- `GET /worlds` liefert lokal im aktuellen App-Zustand `401 Unauthorized`

Wichtige Einordnung:

- der Browser-Client meldet `Auth token acquired`
- der Fehler entsteht nicht vor der Function-Ausfuehrung
- der Fehler entsteht in der Function-Antwort selbst und wird im Gateway nur irrefuehrend als `createExecution failed` geloggt

### 3.2 Zeitliche Einordnung

Beobachteter Verlauf aus der Execution-Historie:

- am `2026-04-06` beantworteten dieselben Deployments `GET /projects` und `GET /worlds` noch mit `200`
- seit `2026-04-07` und `2026-04-08` liefern dieselben Deployments auf denselben Routen `401`

Architektonische Schlussfolgerung:

- die Regression ist sehr wahrscheinlich kein reines Deploy-Problem der betroffenen Functions
- der wahrscheinlichere Ausloeser ist der lokale Integrationszustand zwischen Frontend-Transport und Function-Auth

### 3.3 Konkreter Hotspot

Der wichtigste lokale Verdachtsbereich ist der uncommitted Umbau in `src/lib/api-gateway.ts`:

- vorheriger Pfad:
  direkter HTTP-Fetch zur Function-Domain mit `Authorization: Bearer <jwt>`
- aktueller lokaler Pfad:
  `Functions.createExecution(...)` mit anschliessender Auswertung der Execution-Response

Parallel dazu wurde serverseitig der Auth-Adapter auf `requireUserBootstrap(req)` umgestellt. Diese Kombination ist fachlich plausibel, aber nur dann stabil, wenn die self-hosted Appwrite-Runtime den User-Kontext fuer Executions exakt wie erwartet weiterreicht.

## 4. Branch- und Commit-Landkarte

### 4.1 Baselines

- `main`
  ist die technische Referenzbasis fuer weitere Bereinigung
- `feature/ai-service-refactor`
  enthaelt den AI-Refactor auf aelterer Basis `0aad641`
- `workspace-main-ai-20260406`
  setzt auf neuerem `main` auf und traegt AI-Themen bereits erneut als neue Commits

Das bedeutet:

- `feature/ai-service-refactor` ist kein sauberer Merge-Kandidat in den aktuellen Workspace
- er ist primaer eine inhaltliche Referenz, nicht die richtige Integrationsoperation

### 4.2 AI-Themenblock-Mapping

| Themenblock | `feature/ai-service-refactor` | `workspace-main-ai-20260406` | Einschaetzung |
| --- | --- | --- | --- |
| zentraler AI-Service | `940e24a` | `bef31b7` | fachlich bereits erneut integriert |
| `scriptony-gym` | `2f7811e` | `65322c2` | fachlich bereits erneut integriert |
| `scriptony-image` und `scriptony-video` | `4627635` | `eb3a010` | fachlich bereits erneut integriert |
| STT/TTS in `scriptony-audio` | `3597b3b` | `16c43c9` | fachlich bereits erneut integriert |
| zentrale AI-Konfiguration auf neuer Basis | nicht vorhanden | `722ba3a` | nur im Workspace-/Integrationszweig enthalten |

### 4.3 Scope-Vergleich der Branches

`feature/ai-service-refactor` gegen `main`:

- 28 Dateien
- 7370 Insertions
- Fokus fast ausschliesslich auf AI-Service, Providern und neuen AI-bezogenen Functions

`workspace-main-ai-20260406` gegen `main`:

- 46 Dateien
- 7496 Insertions
- enthaelt AI-Themen plus zusaetzliche Integrationsflaeche:
  `ai-central-store`, `hono-appwrite-handler`, `storage`, `timeline`, `functions/package.json`, Assistant-Settings, Audio-Index und Bootstrap-Skript

### 4.4 Klare Bewertung

Blind-Merge von `feature/ai-service-refactor` in den aktuellen Workspace waere falsch, weil:

- dieselben Themen fachlich bereits in neuer Historie vorhanden sind
- die Branches auf unterschiedlicher technischer Basis stehen
- zusaetzlich lokale uncommitted Aenderungen dieselben Schichten erneut anfassen

Empfohlene Haltung:

- `main` als technische Basis
- `feature/ai-service-refactor` als fachliche Referenz
- `workspace-main-ai-20260406` als Integrationszwischenstand, nicht als vertrauenswuerdige Endwahrheit

## 5. Arbeitsannahmen fuer die naechsten Tickets

Diese Annahmen gelten ab jetzt als operative Guardrails, bis neue Fakten sie widerlegen.

- Keine weiteren grossen Merges in den aktuellen dirty Workspace
- Kein Blind-Merge von `feature/ai-service-refactor`
- Auth-/Transportvertrag wird als eigenes Architekturthema behandelt
- Basis-Flows `Projects` und `Worldbuilding` werden vor jeder tieferen AI-Integration stabilisiert
- Deployte Functions werden immer als eigene Wahrheit gegen Git und lokalen Workspace abgeglichen

## 6. Offene Risiken

- uncommitted Lockfile- und Package-Aenderungen koennen spaeteren Build-/Deploy-Verhalten einen falschen Anschein von Reproduzierbarkeit geben
- neue `appwrite-entry.ts` Dateien deuten auf eine Runtime-Strategie, die moeglicherweise nur teilweise lokal vorhanden oder ausgerollt ist
- `scriptony-audio` und `scriptony-gym` sind im Code stark praesent, aber in Appwrite derzeit nicht live deployt
- die aktuelle `401`-Regression ueberlagert andere Integrationsprobleme und muss deshalb vor weiterer Re-Integration zuerst isoliert werden

## 7. Ergebnis von Ticket 01 und Ticket 02

Ticket 01 ist in der Form abgeschlossen, dass der aktuelle lokale und deployte Ist-Zustand jetzt dokumentiert und als gemeinsame Referenz benennbar ist.

Ticket 02 ist in der Form abgeschlossen, dass fuer die AI-Hauptthemen klar ist:

- welche Themen bereits fachlich auf dem Workspace-Branch angekommen sind
- dass `feature/ai-service-refactor` nicht blind gemerged werden darf
- dass die naechste saubere Arbeit nicht ein Merge, sondern eine kontrollierte Re-Integration entlang der Themenblaecke ist

## 8. Empfohlene direkte Anschluss-Tickets

Naechste sinnvolle Reihenfolge:

1. Ticket 03:
   Auth-/Transportvertrag verbindlich entscheiden
2. Ticket 04:
   `GET /projects` und `GET /worlds` wieder stabil auf `200` bringen
3. Ticket 06:
   Deploy- und Env-Paritaet explizit pruefbar machen
