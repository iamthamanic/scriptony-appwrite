# Puppet-Layer-System - Alle 12 Tickets

## TICKET 1: Database Schema

### 5 neue Collections

1. styleProfiles
2. renderJobs (Official Jobs)
3. imageTasks (Exploratory)
4. guideBundles
5. stageDocuments (2D + 3D vereint)

### Shots Collection Erweiterung

Neue Felder:
- blenderSourceVersion (string)
- blenderSyncRevision (integer)
- guideBundleRevision (integer)
- styleProfileRevision (integer)
- renderRevision (integer)
- lastBlenderSyncAt (string)
- lastPreviewAt (string)
- latestGuideBundleId (string)
- latestRenderJobId (string)
- acceptedRenderJobId (string)

---

## TICKET 2: scriptony-ai (Central Hub) ✅

Responsibility: Routing, Provider Config

Public API:
- /ai/assistant/chat -> scriptony-assistant
- /ai/image/drawtoai -> scriptony-image
- /ai/stage/repair -> scriptony-stage
- /ai/style/profiles -> scriptony-style
- /ai/jobs/:id -> scriptony-stage
- /ai/jobs/:id/accept -> scriptony-stage
- /ai/sync/shot-state -> scriptony-sync
- /ai/stage2d/documents/:shotId -> scriptony-stage2d
- /ai/stage3d/documents/:shotId -> scriptony-stage3d
- /ai/route-request -> scriptony-ai (internal)

---

## TICKET 3: scriptony-stage (Orchestrator) ✅

Job Lifecycle:

1. POST /stage/render-jobs
   Response: { jobId, status: queued, reviewStatus: pending }

2. GET /stage/render-jobs/:id
   Returns: status, reviewStatus, acceptedAt?, acceptedBy?

3. POST /stage/render-jobs/:id/complete
   Action: status = completed, reviewStatus stays pending

4. PUT /stage/render-jobs/:id/accept
   Actions:
   - reviewStatus = accepted
   - acceptedAt = now
   - acceptedBy = userId
   - shots.latestRenderJobId = jobId
   - shots.acceptedRenderJobId = jobId
   - shots.renderRevision++

5. PUT /stage/render-jobs/:id/reject
   Actions:
   - reviewStatus = rejected
   - shots.latestRenderJobId = jobId
   - shots UNCHANGED (acceptedRenderJobId stays!)

---

## TICKET 4: scriptony-image (Execution) ✅

Exploratory (NO reviewStatus):
- POST /image/drawtoai
- POST /image/segment
- GET /image/tasks/:id

Official (internal):
- POST /image/execute-render
  Body: { jobId, payload, callbackBaseUrl }
  Executor calls: POST {callbackBaseUrl}/complete

---

## TICKET 5: scriptony-stage2d ✅

Endpoints:
- GET /stage2d/documents/:shotId
- PUT /stage2d/documents/:shotId
- POST /stage2d/layers
- PUT /stage2d/layers/:layerId
- DELETE /stage2d/layers/:layerId?shotId=
- POST /stage2d/prepare-repair
  Returns: { maskFileId, guideBundleId }
  NO jobId! Frontend calls /ai/stage/repair after

---

## TICKET 6: scriptony-style ✅

Endpoints:
- GET /style/profiles
- POST /style/profiles
- GET /style/profiles/:id
- PUT /style/profiles/:id
- DELETE /style/profiles/:id
- POST /style/apply
- GET /style/shot/:shotId/profile

---

## TICKET 7: scriptony-sync (Blender Ingress) ✅

Allowed: sync-related metadata
- blenderSourceVersion
- blenderSyncRevision
- lastBlenderSyncAt
- guideBundleRevision
- latestGuideBundleId
- lastPreviewAt
- glbPreviewFileId

Forbidden: product decisions
- acceptedRenderJobId
- renderRevision
- reviewStatus
- styleProfileRevision

Endpoints:
- POST /sync/shot-state
  Body: { shotId, blenderSourceVersion?, blenderSyncRevision? }
  Sets: blenderSourceVersion, blenderSyncRevision (monotonic max), lastBlenderSyncAt

- POST /sync/guides
  Body: { shotId, guideBundleRevision?, files?, metadata? }
  Creates guideBundle document + sets: guideBundleRevision, latestGuideBundleId, lastBlenderSyncAt

- POST /sync/preview
  Body: { shotId, lastPreviewAt? }
  Sets: lastPreviewAt (defaults to now)

- POST /sync/glb-preview
  Body: { shotId, glbPreviewFileId? }
  Sets: glbPreviewFileId

Guard rule: assertNoForbiddenFields() rejects any patch containing product-decision fields.

---

## TICKET 8: scriptony-stage3d

Endpoints:
- GET /stage3d/documents/:shotId
- PUT /stage3d/documents/:shotId/view-state

Only View State, never Authoring

---

## TICKET 9: Local Bridge

Node.js Daemon:
- WebSocket to Appwrite
- HTTP to ComfyUI
- HTTP to Blender
- Callback to stage

NO product decisions!

---

## TICKET 10: Blender Addon

Required features:
1. Shot Binding
2. Sync Shot State
3. Publish Preview
4. Publish Guides
5. API Key / Auth
6. Status display

---

## TICKET 11: Freshness Model

Rules:
- guides stale: guideBundleRevision < blenderSyncRevision
- render stale: renderRevision < guideBundleRevision OR renderRevision < styleProfileRevision
- preview stale: !lastPreviewAt OR !lastBlenderSyncAt OR lastPreviewAt < lastBlenderSyncAt

---

## TICKET 12: Frontend Integration

Exploratory Apply (DrawToAI):
- Apply = save as permanent Stage2D layer only
- NO update to shots.acceptedRenderJobId
- NO official shot render

Official Accept (Render):
- reviewStatus = accepted
- shots.acceptedRenderJobId = jobId
- shots.latestRenderJobId = jobId
- shots.renderRevision++

Official Reject:
- reviewStatus = rejected
- shots UNCHANGED (acceptedRenderJobId stays)
