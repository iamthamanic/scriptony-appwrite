# Appwrite Function Inventory

Stand: 2026-04-24
Verifizierungsmarker: ARCH-REF-T00-DONE

## Zusammenfassung

| Metrik | Wert |
| --- | --- |
| Repo-Functions gesamt | 28 |
| Mit deploy-Skript | 19 |
| Ohne deploy-Skript | 9 |
| In `appwrite.json` enthalten | 1 |
| In `appwrite-create-functions.sh` enthalten | 24 |
| Entrypoint `appwrite-entry.ts` | 11 |
| Entrypoint `index.ts` | 15 |
| Entrypoint `health.ts` | 1 |
| Entrypoint `_shared.ts` (keine eigene Function) | 1 |
| Runtime (API-verifiziert) | `node-16.0` |
| Runtime (appwrite.json) | `deno-1.40` (veraltet) |
| Runtime (create-Skript) | `node-16.0` |
| Node 16 EOL | **Sep 2023** — Sicherheitsrisiko fuer langfristige Production |

## Abweichungen (Kritisch)

1. **`appwrite.json` enthaelt nur 1 von 28 Functions.** Die Datei ist veraltet und deckt nicht die tatsaechliche Repo-Struktur ab.
2. **Runtime-Mismatch:** `appwrite.json` sagt `deno-1.40`, das Create-Skript verwendet `node-16.0`, `functions/README.md` beschreibt Node-basierte esbuild-Bundles mit `index.js` Entrypoint.
3. **Deploy-Skripte fehlen fuer 9 Functions:** Ohne deploy-Skripte sind diese Functions manuell oder ueber generische Skripte deployt worden.
4. **`scriptony-logs` und `scriptony-stats`** haben keine eigenen TS/JS-Dateien am Root-Level. Sie sind vermutlich leere Shells oder aggregieren ueber andere Functions.

---

## Inventar pro Function

| Function | Status | Entrypoint | Runtime (appwrite.json) | Deploy-Skript | Health-Route | Frontend-Route | Env-Var-Refs | Notizen |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `make-server-3b52693b` | legacy | `health.ts` | - | **nein** | `/health` | `/` (fallback) | 0 | Legacy unified server; nur Health-Endpoint aktiv; Rest in anderen Functions verschoben. |
| `scriptony-ai` | active | `index.ts` | - | **ja** | `/health` | `/ai/*`, `/providers`, `/api-keys`, `/features`, `/settings` | 0 | AI Control Plane; enthaelt Provider Registry, Feature Routing, Key Storage. |
| `scriptony-assistant` | active | `index.ts` | - | **ja** | `/health` | `/ai/assistant/*`, `/conversations`, `/rag`, `/mcp`, legacy `/ai/chat`, `/ai/settings`, `/ai/models`, `/ai/validate-key`, `/ai/count-tokens`, `/ai/gym` | 0 | Chat Experience, Conversations, Messages, Prompt Handling, RAG. |
| `scriptony-audio` | active | `index.ts` | - | **ja** | `/health` | `/shots/*/audio` (via gateway) | ~10 | TTS/STT, Voice Discovery. Shot-Audio-Routen sind legacy/compat. |
| `scriptony-audio-story` | active | `appwrite-entry.ts` | `deno-1.40` | **ja** | `/health` | `/tracks`, `/sessions`, `/voices`, `/mixing` | 0 | Hoerspiel/Audio Production: Sessions, Tracks, Voices, Mixing. |
| `scriptony-auth` | active | `appwrite-entry.ts` | - | **nein** | `/health` | `/signup`, `/create-demo-user`, `/profile`, `/organizations`, `/integration-tokens`, `/storage`, `/storage-providers` | 0 | Identitaet, Signup, Login, Account Basics. Enthaelt Storage-/OAuth-Logik die nach `scriptony-storage` wandern soll. |
| `scriptony-beats` | active | `appwrite-entry.ts` | - | **ja** | `/health` | `/beats` | 0 | Rhythm/Beat-Planung. |
| `scriptony-characters` | active | `appwrite-entry.ts` | - | **nein** | `/health` | `/characters`, `/timeline-characters` | 0 | Charakter-Verwaltung. |
| `scriptony-clips` | active | `index.ts` | - | **ja** | `/health` | `/clips` | 0 | Editorial Timeline Clips (NLE segments). |
| `scriptony-gym` | active | `index.ts` | - | **ja** | `/health` | `/exercises`, `/progress`, `/achievements`, `/categories`, `/daily-challenge` | ~5 | Fitness/Training-Modul. |
| `scriptony-image` | active | `index.ts` | - | **ja** | `/health` | `/ai/image/*` | 0 | Bildgenerierung, Key Validation, Cover-Produktion. AI Settings sollen nach `scriptony-ai` wandern. |
| `scriptony-jobs-handler` | active? | `index.ts` | - | **nein** | `/health` | - | ~4 | Job-Control-Plane. Dupliziert mit `jobs-handler`. T14 konsolidiert. |
| `scriptony-logs` | repo-only | *(keine root TS/JS)* | - | **nein** | nein | `/logs` | 0 | Keine eigenen Implementierungsdateien. Vermutlich leere Shell oder Aggregator. |
| `scriptony-mcp-appwrite` | active | `index.ts` (create-infra.ts existiert auch) | - | **ja** | `/health` | `/scriptony-mcp/*` | 0 | MCP-style Capability Host. Thin HTTP entry. |
| `scriptony-project-nodes` | active | `appwrite-entry.ts` | - | **nein** | `/health` | `/nodes`, `/initialize-project` | 0 | Template Engine / Nodes. Ziel: `scriptony-structure`. |
| `scriptony-projects` | active | `appwrite-entry.ts` | - | **ja** | `/health` | `/projects` | ~2 | Projekt-CRUD. |
| `scriptony-shots` | active | `appwrite-entry.ts` | - | **ja** | `/health` | `/shots` | 0 | Shot-Verwaltung. Ziel: `scriptony-timeline`. |
| `scriptony-stage` | active | `index.ts` | - | **ja** | `/health` | `/ai/jobs`, `/ai/stage`, `/stage` | 0 | Render-Job Orchestrator (Puppet-Layer). |
| `scriptony-stage2d` | active | `index.ts` | - | **ja** | `/health` | `/ai/stage2d` | 0 | 2D Layer & Repair Endpoints (Puppet-Layer). |
| `scriptony-stage3d` | active | `index.ts` | - | **ja** | `/health` | `/ai/stage3d` | 0 | 3D View-State Endpoints (Puppet-Layer). |
| `scriptony-stats` | repo-only | *(keine root TS/JS)* | - | **nein** | nein | `/stats` | 0 | Keine eigenen Implementierungsdateien. Vermutlich leere Shell oder Aggregator. |
| `scriptony-style` | active | `index.ts` | - | **ja** | `/health` | `/ai/style/*` | 0 | Style-Profile CRUD + Apply (Puppet-Layer). |
| `scriptony-style-guide` | active | `index.ts` | - | **ja** | `/health` | `/style-guide` | 0 | Project Visual Style + Items. |
| `scriptony-superadmin` | active? | `_shared.ts` | - | **nein** | nein | - | 0 | Kein klarer Entrypoint. Vermutlich Admin-Oberflaeche. |
| `scriptony-sync` | active | `index.ts` | - | **ja** | `/health` | `/ai/sync`, `/sync` | 0 | Blender Ingress (nur Metadata, keine Produktentscheidungen). |
| `scriptony-video` | active? | `index.ts` | - | **ja** | `/health` | *(keine aktive Browser-Route)* | ~5 | Deploybar, aber aktuell keine Frontend-Route in `api-gateway.ts`. |
| `scriptony-worldbuilding` | active | `appwrite-entry.ts` | - | **ja** | `/health` | `/worlds`, `/locations` | 0 | Worldbuilding/Orte. |
| `jobs-handler` | legacy | `appwrite-entry.ts` | - | **nein** | `/health` | - | ~4 | Duplikat zu `scriptony-jobs-handler`. T14 konsolidiert. T17 markiert als `LEGACY_DO_NOT_EXTEND`. |

---

## Frontend-Routen-Zuordnung (aus `src/lib/api-gateway.ts`)

| Route-Praefix | Function |
| --- | --- |
| `/signup`, `/create-demo-user`, `/profile`, `/organizations`, `/integration-tokens`, `/storage`, `/storage-providers` | `scriptony-auth` |
| `/projects` | `scriptony-projects` |
| `/style-guide` | `scriptony-style-guide` |
| `/nodes`, `/initialize-project` | `scriptony-project-nodes` |
| `/shots` | `scriptony-shots` |
| `/clips` | `scriptony-clips` |
| `/characters`, `/timeline-characters` | `scriptony-characters` |
| `/stats` | `scriptony-stats` |
| `/logs` | `scriptony-logs` |
| `/beats` | `scriptony-beats` |
| `/worlds`, `/locations` | `scriptony-worldbuilding` |
| `/scriptony-mcp` | `scriptony-mcp-appwrite` |
| `/ai/image` | `scriptony-image` |
| `/ai/jobs`, `/ai/stage`, `/stage` | `scriptony-stage` |
| `/ai/stage2d` | `scriptony-stage2d` |
| `/ai/stage3d` | `scriptony-stage3d` |
| `/ai/style` | `scriptony-style` |
| `/ai/sync`, `/sync` | `scriptony-sync` |
| `/ai/assistant`, `/ai/chat`, `/ai/conversations`, `/ai/rag`, `/ai/settings`, `/ai/models`, `/ai/validate-key`, `/ai/count-tokens`, `/ai/gym` | `scriptony-assistant` |
| `/providers`, `/api-keys`, `/features`, `/settings` | `scriptony-ai` |
| `/ai` (catch-all) | `scriptony-ai` |
| `/conversations`, `/rag`, `/mcp` | `scriptony-assistant` |
| `/tracks`, `/sessions`, `/voices`, `/mixing` | `scriptony-audio-story` |
| `/exercises`, `/progress`, `/achievements`, `/categories`, `/daily-challenge` | `scriptony-gym` |

---

## Deploy-Verfahren

### 1. Einzelne Functions (mit Skript)

```bash
npm run appwrite:deploy:<function-short-name>
```

Verfuegbare npm-Scripts:
`ai`, `assistant`, `audio`, `audio-story`, `beats`, `clips`, `gym`, `image`, `jobs`, `mcp`, `projects`, `shots`, `stage`, `stage2d`, `stage3d`, `style`, `style-guide`, `sync`, `video`, `worldbuilding`

### 2. Function-Definitionen erstellen (ohne Code-Upload)

```bash
npx appwrite-cli login
bash scripts/appwrite-create-functions.sh
```

Erstellt die Function-Definitionen in Appwrite (idempotent, skipped wenn schon existiert).

### 3. Schema + Buckets provisionieren

```bash
npm run appwrite:provision:schema
npm run appwrite:provision:buckets
```

### 4. Domain-Map syncen

```bash
npm run appwrite:sync:function-domains
```

---

## Mismatches und Risiken

| # | Problem | Risiko | Empfohlene Massnahme |
| --- | --- | --- | --- |
| 1 | `appwrite.json` enthaelt nur 1 Function | Deploy-Tools, die auf `appwrite.json` angewiesen sind, deployen nicht alle Functions. | `appwrite.json` entweder aktualisieren oder als veraltet markieren und deploy-Skripte als Quelle der Wahrheit etablieren. |
| 2 | Runtime-Mismatch: `deno-1.40` (appwrite.json) vs `node-16.0` (create-Skript) | Verwirrung beim Debugging; tatsaechliche Runtime ist unklar. | `appwrite.json` aktualisieren oder loeschen. Runtime eindeutig dokumentieren. |
| 3 | 9 Functions ohne dediziertes deploy-Skript | Manuelle Deploys oder vergessene Updates. | Deploy-Skripte fuer `scriptony-auth`, `scriptony-characters`, `scriptony-jobs-handler`, `scriptony-logs`, `scriptony-project-nodes`, `scriptony-stats`, `scriptony-superadmin`, `jobs-handler`, `make-server-3b52693b` anlegen, oder generisches deploy-Skript (`deploy-appwrite-function.sh <name>`) einfuehren. |
| 4 | `scriptony-logs` und `scriptony-stats` ohne Implementierungsdateien | Leere Functions oder Deploy-Fehler. | Pruefen, ob diese Functions in der Console aktiv sind. Falls nicht: als `repo-only` oder `unclear` markieren und ggf. entfernen. |
| 5 | `jobs-handler` + `scriptony-jobs-handler` doppelt vorhanden | Konsistenzrisiko, unklare Ownership. | T14 konsolidiert. Sofort als `LEGACY_DO_NOT_EXTEND` markieren. |
| 6 | `scriptony-video` hat deploy-Skript aber keine Frontend-Route | Möglicherweise ungenutzt oder Zukunfts-Feature. | Pruefen, ob in der Console aktiv. Falls ungenutzt: als `unclear` oder `repo-only` markieren. |
| 7 | `scriptony-superadmin` Entrypoint = `_shared.ts` | Unklare Funktionsweise; `_shared.ts` ist kein typischer Entrypoint. | Pruefen, ob die Function tatsaechlich deployed ist und funktioniert. |

---

## Health-Status (lokal nicht verifizierbar)

Eine direkte Abfrage der deployten Functions war nicht moeglich, da keine Appwrite CLI-Session vorhanden war.

Zur Verifikation muss ein authentisierter Benutzer folgende Pruefungen durchfuehren:

1. `npx appwrite-cli login`
2. `npx appwrite-cli functions list` → Liste mit IDs, Runtimes, Entrypoints und Deployment-Status abgleichen.
3. Pro Function mit aktivem Deployment: `GET https://<function-domain>/health`
4. `VITE_BACKEND_FUNCTION_DOMAIN_MAP` gegen tatsaechliche Domains in der Console abgleichen.
5. Execution Logs pruefen: `npx appwrite-cli functions get-executions --function-id <name>`

---

## Env-Variablen (Functions)

Aus `_shared/env.ts` und den Function-Quellen abgeleitet:

| Variable | Verwendung | Betroffene Functions |
| --- | --- | --- |
| `APPWRITE_ENDPOINT` | Appwrite API Endpoint | alle |
| `APPWRITE_PROJECT_ID` | Appwrite Project ID | alle |
| `APPWRITE_API_KEY` | Server API Key (DB + Storage) | alle |
| `APPWRITE_DATABASE_ID` | Default: `scriptony` | alle |
| `SCRIPTONY_STORAGE_BUCKET_*` | Bucket-Overrides | storage-relevante Functions |
| `scriptony_oauth_*` | Storage-Provider OAuth | `scriptony-auth` (zukuenftig `scriptony-storage`) |
| `SCRIPTONY_DEMO_EMAIL` | Demo-User | `scriptony-auth` |
| `SCRIPTONY_DEMO_PASSWORD` | Demo-User | `scriptony-auth` |
| `SCRIPTONY_DEMO_NAME` | Demo-User | `scriptony-auth` |

**Hinweis Secret-Management:**
- `APPWRITE_API_KEY` muss als Appwrite Function Secret konfiguriert werden (nicht als Plaintext in Git).
- `SCRIPTONY_DEMO_PASSWORD` darf nicht im Repo liegen; muss ueber Appwrite Console als Secret hinterlegt werden.
- `SCRIPTONY_APPWRITE_API_ENDPOINT` kann interne Kubernetes-DNS enthalten und sollte nicht oeffentlich exponiert werden.

---

## Beschluss

- `appwrite.json` ist **veraltet** und nicht mehr vertrauenswuerdig als Deploy-Quelle.
- `scripts/appwrite-create-functions.sh` und `functions/README.md` sind die aktuellen Deploy-Quellen.
- 9 Functions brauchen entweder ein deploy-Skript oder eine Klaerung ihres Deploy-Status.
- `jobs-handler` und `make-server-3b52693b` sind **legacy** und duerfen nicht erweitert werden.
- `scriptony-logs` und `scriptony-stats` mussen auf tatsaechlichen Deploy- und Code-Status geprueft werden.


Stand: 2026-04-24 (API-verifiziert)
Verifizierungsmarker: ARCH-REF-T00-VERIFIED

## Live API-Abfrage

- **Endpoint:** `<APPWRITE_ENDPOINT>` (z. B. `http://localhost:8080/v1`)
- **Project:** `<APPWRITE_PROJECT_ID>`
- **Method:** `GET /v1/functions?limit=100`
- **HTTP Status:** 200

## Deployed Functions (29 aus Appwrite)

| Function | Runtime | Entrypoint | Live | Enabled | Deployment Status | Env Vars |
| --- | --- | --- | --- | --- | --- | --- |
| make-server-3b52693b | node-16.0 | index.js | false | true | *(kein Deployment)* | 0 |
| scriptony-ai | node-16.0 | index.js | false | true | ready | 6 |
| scriptony-assistant | node-16.0 | index.js | false | true | ready | 3 |
| scriptony-audio | node-16.0 | index.js | false | true | ready | 3 |
| scriptony-auth | node-16.0 | index.js | false | true | ready | 8 |
| scriptony-beats | node-16.0 | index.js | **true** | true | ready | 4 |
| scriptony-characters | node-16.0 | index.js | **true** | true | ready | 4 |
| scriptony-clips | node-16.0 | index.js | **true** | true | ready | 4 |
| scriptony-gym | node-16.0 | index.js | false | true | ready | 3 |
| scriptony-image | node-16.0 | index.js | false | true | ready | 3 |
| scriptony-inspiration | node-16.0 | index.js | false | true | ready | 3 |
| scriptony-logs | node-16.0 | index.js | false | true | *(kein Deployment)* | 3 |
| scriptony-mcp-appwrite | node-16.0 | index.js | false | true | *(kein Deployment)* | 3 |
| scriptony-project-nodes | node-16.0 | index.js | **true** | true | ready | 5 |
| scriptony-projects | node-16.0 | index.js | **true** | true | ready | 7 |
| scriptony-shots | node-16.0 | index.js | **true** | true | ready | 5 |
| scriptony-stage | node-16.0 | index.js | false | true | ready | 3 |
| scriptony-stage2d | node-16.0 | index.js | **true** | true | ready | 3 |
| scriptony-stats | node-16.0 | index.js | false | true | *(kein Deployment)* | 3 |
| scriptony-style | node-16.0 | index.js | false | true | ready | 3 |
| scriptony-style-guide | node-16.0 | index.js | **true** | true | ready | 3 |
| scriptony-superadmin | node-16.0 | index.js | false | true | *(kein Deployment)* | 3 |
| scriptony-timeline-v2 | node-16.0 | index.js | false | true | *(kein Deployment)* | 0 |
| scriptony-video | node-16.0 | index.js | false | true | ready | 3 |
| scriptony-worldbuilding | node-16.0 | index.js | false | true | ready | 7 |

## Ergänzungen gegenüber API

### Functions in API aber NICHT im Repo (deleted-only?)
| Function | Deployment Status | Aktion |
| --- | --- | --- |
| scriptony-inspiration | ready | Prüfen ob verwendet. Falls nicht: aus Console entfernen. |
| scriptony-timeline-v2 | *(kein Deployment)* | Leere Definition. Aus Console entfernen oder als `scriptony-timeline` umbenennen. |

### Functions im Repo aber NICHT in API (repo-only)
| Function | Repo-Status |
| --- | --- |
| scriptony-audio-story | Code vorhanden, deploy-Skript vorhanden, aber nicht in API → muss deployed werden |
| scriptony-jobs-handler | Code vorhanden, kein deploy-Skript, nicht in API |
| scriptony-stage3d | Code vorhanden, deploy-Skript vorhanden, nicht in API → muss deployed werden |
| scriptony-sync | Code vorhanden, deploy-Skript vorhanden, nicht in API → muss deployed werden |
| jobs-handler | Legacy, kein deploy-Skript, nicht in API |

## Mismatch-Übersicht

| # | Typ | Details | Severity |
| --- | --- | --- | --- |
| 1 | Repo fehlt in API | `scriptony-audio-story` | high |
| 2 | Repo fehlt in API | `scriptony-stage3d` | high |
| 3 | Repo fehlt in API | `scriptony-sync` | high |
| 4 | API fehlt im Repo | `scriptony-inspiration` | medium |
| 5 | API fehlt im Repo | `scriptony-timeline-v2` | medium |
| 6 | Kein Deployment | `make-server-3b52693b`, `scriptony-logs`, `scriptony-stats`, `scriptony-superadmin`, `scriptony-timeline-v2`, `scriptony-mcp-appwrite` | medium |
| 7 | Kein Deploy-Skript | `scriptony-auth`, `scriptony-characters`, `scriptony-jobs-handler`, `scriptony-logs`, `scriptony-project-nodes`, `scriptony-stats`, `scriptony-superadmin`, `jobs-handler`, `make-server-3b52693b` | medium |

## Alle Runtimes

- Alle deployed Functions verwenden **`node-16.0`** (Nicht `deno-1.40` wie in `appwrite.json` falsch angegeben).
- Alle Entrypoints sind **`index.js`** (nicht `.ts`).
- `functions/README.md` ist korrekt: esbuild bundled zu `index.js`.

## Health-Status

Live-Test über `GET /health` konnte nicht durchgefuehrt werden, da keine Function-Domains/URLs in der API-Response enthalten sind. Zum Health-Check muessten die Console-Domains oder Execution-URLs separat abgefragt werden.

## VITE_BACKEND_FUNCTION_DOMAIN_MAP Abgleich

Das Frontend erwartet Domains in `VITE_BACKEND_FUNCTION_DOMAIN_MAP`. Ohne Console-Zugriff konnte nicht verifiziert werden, ob alle `live=true` Functions auch tatsaechlich in der Domain-Map eingetragen sind.
