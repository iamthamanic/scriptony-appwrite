# Async Jobs Architecture

## Übersicht

Diese Architektur löst das 408 Timeout-Problem für lang laufende Operationen durch ein **Job Queue Pattern** mit Accept-Poll Mechanismus.

## Warum?

- **Vite Dev Proxy**: Timeout bei > 30-60s
- **Appwrite Functions**: Timeout bei 300s (aber Nginx/Proxy davor kann früher abbrechen)
- **Langlaufende Operationen**: Image-Generierung, Audio-Verarbeitung, Style-Guide Palette-Extraktion

## Architektur

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│     Client      │────▶│  Jobs Handler    │────▶│    Function     │
│                 │     │                  │     │  (async worker) │
│  useLongRunning │◀────│  Creates Job     │     │                 │
│     Job()       │     │  Returns jobId   │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                          │
         │              Polling: GET /v1/jobs/:id/status     │
         │◀─────────────────────────────────────────────────┘
         │              Updates: progress, result, error
         │
         ▼
   Ergebnis anzeigen
```

## Komponenten

### 1. Backend

#### `functions/scriptony-jobs-handler/`
- **POST /v1/jobs/:functionName** - Erstellt Job, startet sofortige Ausführung
- **GET /v1/jobs/:jobId/status** - Schneller Status-Check (< 100ms)
- **GET /v1/jobs/:jobId/result** - Finale Ergebnis (nur bei status=completed)

#### `functions/_shared/jobs/`
- `types.ts` - Shared TypeScript Interfaces
- `jobService.ts` - Datenbank-Operationen für Jobs
- `jobRunner.ts` - Helper: `runAsJob()`, `getJobStatus()`
- `jobWorker.ts` - Helper für Worker-Functions: `reportJobProgress()`, `completeJob()`, `failJob()`

### 2. Frontend

#### `src/hooks/useLongRunningJob.ts`
```typescript
const { start, status, progress, result, error, isLoading } = 
  useLongRunningJob<StyleGuideResult>();

// Starten
const { jobId } = await start('style-guide', { projectId: '123' });

// Polling läuft automatisch
// status wechselt: pending → processing → completed/failed
```

#### `src/lib/jobs/`
- `jobApi.ts` - API-Client für Job-Endpunkte
- `types.ts` - TypeScript Interfaces (spiegeln Backend)

### 3. Database

**Collection: `jobs`**
- `function_name` - string
- `status` - enum: pending, processing, completed, failed, cancelled
- `payload_json` - string (serialized)
- `result_json` - string (serialized)
- `error` - string
- `progress` - number (0-100)
- `user_id` - string
- `created_at`, `updated_at`, `completed_at` - datetime

## Setup

### 1. Collection anlegen (einmalig)

Appwrite Console → Databases → scriptony-dev → Create Collection:

```json
{
  "$id": "jobs",
  "name": "jobs",
  "attributes": [... aus infra/appwrite/collections/jobs.json ...]
}
```

### 2. Function deployen

```bash
# Jobs Handler
npm run deploy:jobs

# Style-Guide (optional für neue Features)
npm run deploy:style-guide
```

### 3. Frontend Integration

Bisheriger Code:
```typescript
const result = await api.post('/style-guide/123/extract-palette', { imageUrl });
// ^ 408 Timeout bei langsamen Operationen
```

Neuer Code:
```typescript
const { start, result, isLoading } = useLongRunningJob();

const handleExtract = async () => {
  await start('style-guide', { 
    projectId: '123', 
    action: 'extract-palette',
    imageUrl 
  });
};

// UI zeigt Lade-Status
// result ist verfügbar wenn status === 'completed'
```

## Supported Jobs

Aktuell implementiert in `functions/scriptony-jobs-handler/index.ts`:

| Job Type | Function ID | Timeout | Beschreibung |
|----------|------------|---------|--------------|
| `style-guide` | `scriptony-style-guide` | 120s | Style Guide Operationen |
| `image-generate` | `scriptony-image` | 180s | Bildgenerierung |
| `audio-process` | `scriptony-audio` | 300s | Audio-Verarbeitung |

## Vorteile

1. **Keine Timeouts** - Client polled, Function arbeitet im Hintergrund
2. **Progress-Anzeige** - Prozentuale Fortschrittsanzeige möglich
3. **Resilienz** - Client kann reconnecten, Job läuft weiter
4. **Cancel/Retry** - Jobs können abgebrochen und neu gestartet werden
5. **Skalierbar** - Einfaches Hinzufügen neuer Job-Typen

## Erweiterung

Neuen Job-Typ hinzufügen:

1. **In `functions/scriptony-jobs-handler/index.ts`**:
```typescript
const SUPPORTED_JOBS = {
  ...
  "my-new-job": {
    functionId: "scriptony-my-function",
    timeoutMs: 60000,
    requiresAuth: true,
  }
};
```

2. **In Worker-Function**:
```typescript
import { extractJobContext, wrapWithJobReporting } from "../_shared/jobs";

export default async function handler(req, res) {
  const context = extractJobContext(req.body);
  
  const result = await wrapWithJobReporting(context, async (reportProgress) => {
    // Deine Operation hier
    reportProgress(50);
    const result = await doWork();
    return result;
  });
}
```

3. **Frontend**:
```typescript
const { start } = useLongRunningJob();
await start('my-new-job', payload);
```

## Cleanup

Alte Jobs automatisch löschen (z.B. per Cron):

```bash
# Einmalig
POST /v1/jobs/cleanup
{ "hours": 24 }

# Oder in Appwrite Function mit Cron-Trigger
```
