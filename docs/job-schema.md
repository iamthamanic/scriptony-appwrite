# Job Schema — T14 Einheitliche Job-Control-Plane

**Date:** 2026-04-26  
**Status:** Active (scriptony-jobs-handler)  
**Verification Marker:** ARCH-REF-T14-DONE

## Active Function

| Function | Runtime | Status | Entrypoint |
|----------|---------|--------|------------|
| `scriptony-jobs-handler` | node-16.0 | **active** | `index.js` |
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

## SUPPORTED_JOBS Registry

Aktive Job-Typen (in `functions/scriptony-jobs-handler/index.ts`):

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
