# Backend Domain Map

Stand: 2026-04-26
Verifizierungsmarker: ARCH-REF-T01-DONE

## Zweck

Diese Domain Map ist die verbindliche Zuordnung fuer neue Features.
Wenn ein Feature nicht eindeutig zugeordnet werden kann, muss vor der Implementierung
die Map erweitert oder eine Ticket-Diskussion gefuehrt werden.

---

## Legende

| Status | Bedeutung |
|--------|-----------|
| `keep` | Function bleibt wie ist, Ziel-Function = aktuelle Function. |
| `rename` | Function wird umbenannt, Verantwortung bleibt gleich. |
| `split` | Function wird in mehrere Ziel-Functions aufgeteilt. |
| `merge` | Function wird in eine andere Ziel-Function eingegliedert. |
| `new` | Ziel-Function existiert noch nicht, muss neu gebaut werden. |
| `legacy` | Function darf nicht mehr erweitert werden. |
| `unclear` | Grenze muss spaeter geklaert werden. |

---

## Aktuelle Functions → Ziel-Functions

### Core

| Aktuelle Function | Ziel-Function | Status | Erlaubte Verantwortung | Verbotene Verantwortung | Owned Datenmodelle | Read Datenmodelle | Externe Provider | Migrationsnotizen |
|---|---|---|---|---|---|---|---|---|
| `scriptony-auth` | `scriptony-auth` | `keep` | Identitaet, Signup, Login, Account Basics, JWT | Storage-OAuth, Projektfreigaben, Orgs/Members | `users`, `accounts`, `sessions` | — | — | Storage-/OAuth-Code nach `scriptony-storage` wandern (T10/T20) |
| `scriptony-projects` | `scriptony-projects` | `keep` | Projekt-CRUD, Projekt-Metadaten, Owner-Verwaltung | Projekt-Members, Einladungen, Orgs | `projects` | — | — | `created_by` muss zu `owner_type`/`owner_id` werden (T21) |
| `scriptony-project-nodes` | `scriptony-structure` | `rename` | Template Engine, Nodes, Node-Hierarchie, Node-Metadaten | Charaktere, Shots, Assets, Script-Text | `nodes`, `node_types` | `projects` | — | Umbenennung, keine neue Logik in project-nodes (T01) |
| `scriptony-script` | `scriptony-script` | `new` | Script-CRUD, Block-CRUD, Reorder, Script-Text als Source of Truth | Audio, Assets, Timeline | `scripts`, `script_blocks` | `projects`, `characters` | — | Neu bauen (T03/T04) |
| `scriptony-characters` | `scriptony-characters` | `keep` | Charakter-CRUD, Charakter-Attribute, Timeline-Charaktere | Script-Text, Shots, Assets | `characters`, `character_attributes` | `projects` | — | — |
| `scriptony-worldbuilding` | `scriptony-worldbuilding` | `keep` | Orte, Welten, Worldbuilding-Metadaten | Script, Audio, Assets | `worlds`, `locations` | `projects` | — | — |
| `scriptony-timeline-v2` | — | `legacy` | — | — | — | — | — | Leere API-Definition (kein Deployment, 0 Executions, keine Frontend-Referenzen). T17: entfernen. |
| `scriptony-shots` | `scriptony-timeline` | `merge` | Shot-CRUD, Shot-Reihenfolge, Shot-Metadaten | Audio-Assets, Script-Text | `shots` | `projects`, `nodes` | — | Shot-Daten bleiben; UI/Logic wandert zu Timeline (T13) |
| `scriptony-clips` | `scriptony-timeline` | `merge` | Clip-CRUD, Clip-Timing, NLE-Segmente | Audio-Assets | `clips` | `projects`, `shots` | — | Clip-Daten bleiben; UI/Logic wandert zu Timeline (T13) |
| `scriptony-editor-readmodel` | `scriptony-editor-readmodel` | `new` | Read-only Aggregation: Project, Structure, Characters, Script Blocks, Shots, Clips, Assets, Audio Tracks, Style Summary | Schreiboperationen, Provider Calls, Job-Erstellung | *(read-only)* | `projects`, `nodes`, `characters`, `script_blocks`, `shots`, `clips`, `assets`, `scene_audio_tracks` | — | Neu bauen (T12) |
| `scriptony-inspiration` | `scriptony-inspiration` | `keep` | Projekt-Inspirationen, Moodboards, Source-Links | — | `project_inspirations` | `projects` | — | API-only Function (kein Repo-Code, keine Frontend-Route). Laeuft in Appwrite. |

### Media

| Aktuelle Function | Ziel-Function | Status | Erlaubte Verantwortung | Verbotene Verantwortung | Owned Datenmodelle | Read Datenmodelle | Externe Provider | Migrationsnotizen |
|---|---|---|---|---|---|---|---|---|
| `scriptony-assets` | `scriptony-assets` | `new` | Asset-Metadaten, Upload, Link, Query, Owner-Verknuepfung | Physische Storage, OAuth, Provider-Tokens | `assets` | `projects` | — | Neu bauen (T05/T06) |
| `scriptony-audio` | `scriptony-audio` | `keep` | TTS, STT, Voice Discovery | Shot-Audio-Uploads, Audio-Production-Planung | `tts_requests`, `stt_requests`, `voice_configs` | `projects` | OpenAI (TTS), ElevenLabs (TTS), Google (TTS), Whisper (STT), Ollama | Shot-Audio-Routen als legacy/compat markieren (T09) |
| `scriptony-image` | `scriptony-image` | `keep` | Bildgenerierung, Bild-Tasks, Segmentierung | AI Settings, Key Validation, Stage Render | `image_tasks` | `projects` | OpenAI (DALL-E), Midjourney, Stability AI, Google (Imagen) | AI Settings nach `scriptony-ai` (T10) |
| `scriptony-video` | `scriptony-video` | `keep` | Video-Generierung, Export | — | `video_tasks` | `projects` | Runway, Pika, OpenAI (Sora) | Aktuell keine Frontend-Route; muss geprueft werden |
| `scriptony-media-worker` | `scriptony-media-worker` | `new` | Worker-Orchestration: Mix, Render, Export, Conversion, Palette, Normalisierung | Job-Source-of-Truth, Produktentscheidungen | *(worker payloads)* | `jobs` | FFmpeg, Blender | Neu bauen (T15) |

### Workflows

| Aktuelle Function | Ziel-Function | Status | Erlaubte Verantwortung | Verbotene Verantwortung | Owned Datenmodelle | Read Datenmodelle | Externe Provider | Migrationsnotizen |
|---|---|---|---|---|---|---|---|---|
| `scriptony-audio-story` | `scriptony-audio-production` | `rename` | Audio-Sessions, Tracks, Voice-Casting, Mixing-Orchestration | TTS/STT Engine, Script-Text als Source of Truth | `audio_sessions`, `scene_audio_tracks`, `character_voice_assignments` | `script_blocks`, `projects` | — | Umbenennen; TTS bleibt bei `scriptony-audio` (T07/T08) |
| `scriptony-stage` | `scriptony-stage` | `keep` | Render-Job Orchestrator, Accept/Reject/Complete | 2D/3D Engine, Style-Profile-Logik | `render_jobs` | `projects`, `shots` | — | — |
| `scriptony-stage2d` | `scriptony-stage2d` | `keep` | 2D Layer & Repair Endpoints | Orchestration, Produktentscheidungen | `layer_states` | `projects`, `render_jobs` | — | Puppet-Layer |
| `scriptony-stage3d` | `scriptony-stage3d` | `keep` | 3D View-State Endpoints | Orchestration, Produktentscheidungen | `view_states` | `projects`, `render_jobs` | Three.js, Babylon.js | Puppet-Layer |
| `scriptony-style` | `scriptony-style` | `keep` | Style-Profile CRUD, Apply | Bildgenerierung, Render-Engine | `style_profiles` | `projects`, `shots` | — | Puppet-Layer |
| `scriptony-style-guide` | `scriptony-style-guide` | `keep` | Project Visual Style, Style-Items | — | `project_visual_styles`, `style_items` | `projects` | — | — |
| `scriptony-sync` | `scriptony-sync` | `keep` | Blender Ingress (nur Metadaten) | Produktentscheidungen, Schreiboperationen | `sync_metadata` | `projects` | Blender | Keine Produktlogik hier (T16) |
| `scriptony-gym` | `scriptony-gym` | `keep` | Exercises, Progress, Achievements, Daily Challenge | — | `exercises`, `progress`, `achievements` | `projects`, `users` | — | — |
| `scriptony-beats` | `scriptony-beats` | `keep` | Storybeat-Planung (Save the Cat, Hero's Journey), prozentuale Timeline-Position, Template-Zuweisung | Audioproduktion, Asset-Upload, Node-CRUD | `story_beats` | `projects`, `nodes` | — | Bruecken-Service zwischen Structure und Timeline; 1014-Zeilen-Frontend-Component (CapCut-style Ripple Editing) |

### Platform

| Aktuelle Function | Ziel-Function | Status | Erlaubte Verantwortung | Verbotene Verantwortung | Owned Datenmodelle | Read Datenmodelle | Externe Provider | Migrationsnotizen |
|---|---|---|---|---|---|---|---|---|
| `scriptony-ai` | `scriptony-ai` | `keep` | Provider Registry, Feature Routing, API Keys, Model Config | Chat, Conversations, Generierung | `ai_providers`, `ai_features`, `api_keys` | `projects` | OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Ollama | — |
| `scriptony-assistant` | `scriptony-assistant` | `keep` | Chat, Conversations, Messages, Prompt Handling, RAG | AI Settings, Gym, MCP | `conversations`, `messages`, `rag_chunks` | `projects` | OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Ollama | — |
| `scriptony-jobs-handler` | `scriptony-jobs` | `rename` | Job-Status, Retry, Cancel, Cleanup, Result-Struktur | Worker-Execution, Produktlogik | `jobs` | `projects` | — | Einheitliche Job-Control-Plane (T14) |
| `jobs-handler` | `scriptony-jobs` / `legacy` | `legacy` | — | — | — | — | — | Duplikat zu `scriptony-jobs-handler`. Nicht erweitern. (T14/T17) |
| `scriptony-observability` | `scriptony-observability` | `new` | Stats, Logs, Health-Checks (read-only) | Admin-Schreiboperationen | *(read-only views)* | `projects`, `functions` | — | Neu bauen; `scriptony-stats` + `scriptony-logs` konsolidieren (T16) |
| `scriptony-admin` | `scriptony-admin` | `new` | Superadmin, Globale Kennzahlen, Benutzerverwaltung | Produktlogik, Observability | `admin_logs` | `users`, `projects`, `organizations` | — | Neu bauen; `scriptony-superadmin` konsolidieren (T16) |
| `scriptony-mcp-appwrite` | `scriptony-mcp-appwrite` | `keep` | MCP Tool Registry, Thin HTTP Entry | AI Control, Chat | `mcp_tools` | `projects` | — | — |
| `scriptony-storage` | `scriptony-storage` | `new` | Storage Provider, OAuth, Connections, Targets, Objects, Sync, Import, Export | Asset-Metadaten (bleiben bei `scriptony-assets`) | `storage_connections`, `storage_targets`, `storage_objects` | `projects`, `assets` | AWS S3, Google Cloud Storage, Dropbox, OneDrive, Appwrite Storage | Neu bauen (T20) |
| `scriptony-collaboration` | `scriptony-collaboration` | `new` | Projektfreigaben, Members, Rollen, Einladungen, Orgs, Access-Checks | Identitaet, Login, Signup | `project_members`, `project_invites`, `organization_members`, `organization_invites` | `projects`, `users` | — | Neu bauen (T21) |

---

## Legacy Functions (nicht erweitern)

Diese Functions existieren im Repo oder auf dem Server, duerfen aber **nicht**
mehr erweitert werden. Neue Features gehoeren in die Ziel-Domain aus der
obigen Map.

| Aktuelle Function | Ziel-Domain | Status | Warum legacy |
|---|---|---|---|
| `make-server-3b52693b` | — | `legacy` | Unified-Server-Wrapper; nur Health-Endpoint aktiv; Rest in anderen Functions verschoben. Keine eigenen Geschaeftslogik-Dateien. |
| `scriptony-logs` | `scriptony-observability` | `legacy` | Keine eigenen Implementierungsdateien. Wird in T16 in `scriptony-observability` konsolidiert. |
| `scriptony-stats` | `scriptony-observability` | `legacy` | Keine eigenen Implementierungsdateien. Wird in T16 in `scriptony-observability` konsolidiert. |
| `scriptony-superadmin` | `scriptony-admin` | `legacy` | Kein klarer Entrypoint; Admin-Oberflaeche. Wird in T16 in `scriptony-admin` konsolidiert. |
| `scriptony-timeline-v2` | — | `legacy` | Leere API-Definition (kein Deployment, 0 Executions, keine Frontend-Referenzen). T17: entfernen. |
| `jobs-handler` | `scriptony-jobs` | `legacy` | Duplikat zu `scriptony-jobs-handler`. T14 konsolidiert. |

---

## Storage-/OAuth-Grenze

| Aktuelle Location | Ziel-Domain | Status | Beispiele |
|---|---|---|---|
| `scriptony-auth` (Storage-Provider-OAuth) | `scriptony-storage` | `future` | `storage-providers`, `integration-tokens` |
| `scriptony-auth` (Organisationen) | `scriptony-collaboration` | `future` | `organizations`, `organization_members` |

---

## Access-Helper Konzept

```typescript
async function canReadProject(userId: string, projectId: string): Promise<boolean>
async function canEditProject(userId: string, projectId: string): Promise<boolean>
async function canManageProject(userId: string, projectId: string): Promise<boolean>
```

**Initiale Implementierung (Single-User):**
```typescript
async function canEditProject(userId: string, projectId: string): Promise<boolean> {
  const project = await getProject(projectId);
  return project.created_by === userId;
}
```

**Ziel-Implementierung (Multi-User):**
```typescript
async function canEditProject(userId: string, projectId: string): Promise<boolean> {
  const project = await getProject(projectId);
  return (
    (project.owner_type === 'user' && project.owner_id === userId) ||
    (project.owner_type === 'organization' && await isOrgMemberWithEdit(userId, project.owner_id)) ||
    (await hasProjectRole(userId, projectId, ['owner', 'editor', 'admin']))
  );
}
```

**Regel:** Neue Functions muessen Access-Helper nutzen. Direkte `created_by`-Checks sind verboten.

---

## Direct Project Sharing

Ein Nutzer muss ein Projekt direkt mit einer anderen Person teilen koennen,
ohne vorher eine Organisation zu erstellen. Organisationen sind optionaler Kontext.

```typescript
// project_members (fuer Direct Sharing)
{
  id: string,
  project_id: string,
  user_id: string,
  role: 'owner' | 'editor' | 'viewer',
  status: 'active' | 'pending',
  invited_by: string,
  created_at: datetime
}
```

---

## Datenmodell-Ownership-Matrix

| Datenmodell | Owner | Leser | Verboten |
|---|---|---|---|
| `users`, `accounts` | `scriptony-auth` | `scriptony-collaboration` | — |
| `projects` | `scriptony-projects` | Alle Core | — |
| `nodes` | `scriptony-structure` | `scriptony-editor-readmodel` | `scriptony-audio-production` |
| `scripts`, `script_blocks` | `scriptony-script` | `scriptony-audio-production`, `scriptony-editor-readmodel` | `scriptony-audio` |
| `characters` | `scriptony-characters` | `scriptony-script`, `scriptony-audio-production`, `scriptony-editor-readmodel` | — |
| `worlds`, `locations` | `scriptony-worldbuilding` | `scriptony-editor-readmodel` | — |
| `shots`, `clips` | `scriptony-timeline` | `scriptony-stage`, `scriptony-editor-readmodel` | `scriptony-assets` |
| `assets` | `scriptony-assets` | Alle Media, Workflows, Core | `scriptony-storage` (nur physische Dateien) |
| `audio_sessions`, `scene_audio_tracks` | `scriptony-audio-production` | `scriptony-editor-readmodel` | `scriptony-audio` |
| `tts_requests`, `stt_requests` | `scriptony-audio` | `scriptony-audio-production` | — |
| `render_jobs` | `scriptony-stage` | `scriptony-stage2d`, `scriptony-stage3d` | — |
| `jobs` | `scriptony-jobs` | `scriptony-media-worker`, `scriptony-stage` | — |
| `storage_connections`, `storage_targets`, `storage_objects` | `scriptony-storage` | `scriptony-assets` | — |
| `project_members`, `organization_members`, `invites` | `scriptony-collaboration` | `scriptony-auth` (Login check) | — |

---

## Migrationsplan (High-Level)

| Phase | Tickets | Ziel |
|---|---|---|
| Phase 0 | T00 | Inventarisierung ✅ |
| Phase 1 | T01, T02 | Domain Map + Shim-Gate ✅/In Arbeit |
| Phase 2 | T03, T04 | `scriptony-script` bauen |
| Phase 3 | T05, T06 | `scriptony-assets` bauen |
| Phase 4 | T07, T08 | Audio-Production abgrenzen |
| Phase 5 | T09 | `scriptony-audio` bereinigen |
| Phase 6 | T10, T11 | `scriptony-image` + `scriptony-assistant` bereinigen |
| Phase 7 | T12 | `scriptony-editor-readmodel` bauen |
| Phase 8 | T13 | Timeline konsolidieren |
| Phase 9 | T14, T15 | Jobs + Media-Worker |
| Phase 10 | T16 | Observability + Admin |
| Phase 11 | T17 | Legacy entfernen |
| Laufend | T18-T21 | Shared Logic, UI-Checks, Storage, Collaboration |

---

## Querreferenzen

- `docs/appwrite-function-inventory.md` — Deployments, Entry Points, Runtimes
- `docs/scriptony-architecture-refactor-master.md` — Shimwrappercheck Gates, Zielarchitektur
- `docs/architecture-refactor-domains.md` — Ziel-Domaenen (Storage, Collaboration)
- `docs/architecture-refactor-done-reports.md` — Done Reports aller Phasen
