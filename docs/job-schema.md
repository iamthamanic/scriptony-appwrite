# Job Schema — T14 Einheitliche Job-Control-Plane

**Date:** 2026-04-26  
**Status:** Active (scriptony-jobs)  
**Verification Marker:** ARCH-REF-T14-DONE

## Active Function

| Function | Runtime | Status | Entrypoint |
|----------|---------|--------|------------|
| `scriptony-jobs` | node-16.0 | **active** | `index.js` |
| `jobs-handler` | Deno | **LEGACY_DO_NOT_EXTEND** | N/A (nicht deployed) |

## Collection: `jobs`

Location: Database `scriptony`, Collection `jobs` (per `functions/_shared/appwrite-db.ts` C.jobs)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `function_name` | String | ✅ | Job-Typ (z.B. `style-guide`, `image-generate`) |
| `status` | Enum | ✅ | `pending`, `processing`, `completed`, `failed` |
| `payload_json` | String (JSON) | ✅ | Serialized Job-Payload |
| `user_id` | String | ✅ | Ersteller |
| `progress` | Integer | ❌ | 0–100 |
| `result_json` | String (JSON) | ❌ | Serializeiertes Ergebnis |
| `error` | String | ❌ | Fehlertext (max 2000 Zeichen) |
| `created_at` | DateTime | ✅ | ISO-8601 |
| `updated_at` | DateTime | ✅ | ISO-8601 |
| `completed_at` | DateTime | ❌ | ISO-8601 |

## Collection: `job_snapshots`

Location: Database `scriptony`, Collection `job_snapshots` (T08)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | String | ✅ | Zugehöriges Projekt |
| `scene_id` | String | ❌ | Optionale Szene |
| `script_id` | String | ❌ | Optionales Script |
| `script_block_ids` | String[] | ❌ | Referenzierte Blöcke |
| `snapshot_json` | String (JSON) | ✅ | Serialized Snapshot (< 50 KB) |
| `created_by` | String | ✅ | Ersteller |
| `created_at` | DateTime | ✅ | ISO-8601 |
| `updated_at` | DateTime | ✅ | ISO-8601 |

## API Endpoints

### POST /v1/jobs/:functionName
Erstellt einen Job und triggered asynchrone Ausführung.

**Request:**
```json
{
  "payload": { "projectId": "...", "param": "..." }
}
```

**Response (201):**
```json
{
  "jobId": "...",
  "status": "pending",
  "message": "Job queued for image-generate",
  "createdAt": "2026-04-26T20:00:00Z"
}
```

### GET /v1/jobs/:jobId/status
Schneller Status-Check.

**Response (200):**
```json
{
  "success": true,
  "jobId": "...",
  "status": "processing",
  "progress": 42,
  "result": null,
  "error": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### GET /v1/jobs/:jobId/result
Holt das Ergebnis (nur wenn `status === "completed"`).

**Response (200 completed):**
```json
{
  "success": true,
  "result": { ... },
  "completedAt": "..."
}
```

**Response (202 processing):**
```json
{
  "success": false,
  "error": "Job still processing",
  "status": "processing",
  "progress": 42
}
```

**Response (500 failed):**
```json
{
  "success": false,
  "error": "Job failed: ...",
  "status": "failed"
}
```

### POST /v1/jobs/cleanup
Löscht abgeschlossene/fehlgeschlagene Jobs älter als N Stunden.

**Request:**
```json
{ "hours": 24 }
```

---

## Direct-DB-Write Pfad

Nicht alle Functions erzeugen Jobs über den HTTP-Endpoint `POST /v1/jobs/:functionName`.
Orchestration-Functions, die selbst in einem Appwrite Function-Kontext laufen und
keinen HTTP-Overhead wollen, können Jobs **direkt in die Collection schreiben**.

### Aktuelle Nutzer

| Function | Pfad | Methode |
|----------|------|---------|
| `scriptony-audio-story` | `functions/scriptony-audio-story/_shared/job-service.ts` | `createDocument(C.jobs, ...)` |

### Warum Direct-Write?

- **KISS:** Kein HTTP-Roundtrip innerhalb desselben Appwrite-Clusters.
- **Atomarität:** Job-Erstellung + Snapshot-Erstellung in derselben Transaktion/Logik.
- **Autorisierung:** Der Aufrufer ist bereits authentifiziert (Function-Context);
  kein separater Auth-Header nötig.

### Regeln für Direct-Write

1. **Pflichtfelder:** `function_name`, `status`, `payload_json`, `user_id`, `created_at`, `updated_at`.
2. **Payload-Limit:** `payload_json` muss unter 100 KB bleiben (Appwrite Document Limit).
   Bei grösseren Daten: Snapshot in `job_snapshots` speichern und nur `snapshot_id`
   im Job-Payload referenzieren.
3. **Trigger:** Nach `createDocument` muss der Worker wie üblich via
   `triggerFunctionExecution()` gestartet werden **oder** der Job wird von einem
   externen Poll/Queue-Worker abgeholt.
4. **Schema-Konformität:** Direct-Write muss exakt dasselbe Schema nutzen wie
   der `/v1/jobs`-Endpoint (Felder, Typen, Defaults).

### Beispiel (scriptony-audio-story)

```typescript
import { ID } from "node-appwrite";
import { createDocument, dbId, C } from "../../_shared/appwrite-db";

const job = await createDocument(dbId(), C.jobs, ID.unique(), {
  function_name: "audio-production-generate",
  status: "pending",
  payload_json: JSON.stringify({ snapshot_id: snapId, project_id: projectId }),
  user_id: userId,
  progress: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: null,
});
```

> **Hinweis:** Der Direct-Write-Pfad ist kein Bug. Er ist ein bewusstes
> Architektur-Muster für interne Function-zu-Function-Kommunikation.
> Für externe Clients (Frontend, Third-Party) bleibt der HTTP-Endpoint
> `/v1/jobs/:functionName` der verbindliche Einstieg.

---

## SUPPORTED_JOBS Registry

Aktive Job-Typen (in `functions/scriptony-jobs/index.ts`):

| Job-Typ | Ziel-Function | Timeout | Auth |
|---------|--------------|---------|------|
| `style-guide` | `scriptony-style-guide` | 120s | ✅ |
| `image-generate` | `scriptony-image` | 180s | ✅ |
| `audio-process` | `scriptony-audio` | 300s | ✅ |
| `audio-production-generate` | `scriptony-audio-story` | 300s | ✅ |
| `audio-production-preview` | `scriptony-audio-story` | 300s | ✅ |
| `audio-production-export` | `scriptony-audio-story` | 600s | ✅ |

**Neue Job-Typen nur mit:**
1. Eintrag in `SUPPORTED_JOBS`
2. Ziel-Function muss `__jobId` + `__userId` aus Payload extrahieren
3. Ziel-Function reportet Fortschritt via `_shared/jobs/jobWorker.ts`

## Worker-Progress-Reporting

Worker-Functions nutzen `_shared/jobs/jobWorker.ts`:

```typescript
import { extractJobContext, reportJobProgress, completeJob, failJob } from "../_shared/jobs/jobWorker";

const jobContext = extractJobContext(body);
if (jobContext?.isJob) {
  await reportJobProgress(jobContext.jobId, 50);
  await completeJob(jobContext.jobId, result);
}
```

## Legacy / Removed

| Komponent | Status | Grund |
|-----------|--------|-------|
| `jobs-handler/` (Deno) | LEGACY | `Deno.serve`, `npm:hono`, nicht Node-kompatibel |
| `_shared/jobs/jobService.ts` | @deprecated | Deno-only, broken imports |
| `_shared/jobs/jobRunner.ts` | @deprecated | Nutzt jobService (broken) |

## Field-Name-Konvention

- **Active (Node):** snake_case (`function_name`, `payload_json`, `result_json`, `user_id`, `created_at`)
- **Legacy (Deno):** camelCase (`functionName`, `payload`, `result`, `userId`, `createdAt`)

Neue DB-Fields immer **snake_case** (Appwrite + Scriptony-Konvention).
