# Desktop-first development (Tauri + local runtime)

> **Audience:** Humans and AI agents working on the native Scriptony app.  
> **Goal:** Run and extend Scriptony as a **local** `.scriptony` app without touching Appwrite unless the ticket is explicitly cloud/hybrid.

Canonical start commands: **`docs/GETTING_STARTED.md`** § Option C. Agent rules: **`AGENTS.md`** § Desktop-first.

---

## Daily workflow

```bash
docker stop scriptony-frontend 2>/dev/null || true
npm run dev:desktop
```

| Step | Action |
|------|--------|
| 1 | Wait for Tauri window (Vite serves UI on `:3000` **inside** the shell only). |
| 2 | On first run without a workspace: **Workspace einrichten** (`FirstRunWorkspaceGate`) — pick a folder. Later: Settings → Speicher → **Lokal** → Workspace wählen/wechseln. |
| 3 | Open or create a **`.scriptony`** project for `LocalBackend` (SQLite, structure, scripts). |
| 4 | Keep runtime **Lokal** in Settings unless testing cloud. |

### `.env.local` (desktop-only)

```bash
VITE_SCRIPTONY_RUNTIME=local
```

Appwrite keys (`VITE_APPWRITE_*`, `VITE_BACKEND_FUNCTION_DOMAIN_MAP`) are **optional** until you need hybrid features (KI, TTS, cloud sync). Leaving them empty avoids accidental cloud calls for lists that already have local adapters.

### Do not use for routine desktop work

- `npm run dev` — full Docker stack, port 3000 conflict, Appwrite required.
- `npm run dev:vite` alone — browser tab, cloud-default unless overrides.
- `./scripts/deploy-appwrite-function.sh` — only for cloud/function tickets.

---

## How runtime routing works

```
UI (pages/hooks)
  → utils/api.tsx (legacy facade) OR lib/api-adapter/*
  → dispatchByRuntime(cloudFn, localFn)  in runtime-dispatch.ts
  → local: workspace scan / LocalBackend / src/local/*
  → cloud: cloudFetch / Appwrite Functions
```

**Tauri without `VITE_SCRIPTONY_RUNTIME`:** `detect-runtime.ts` sets profile **`local`**.

**Hybrid:** With Appwrite env set, `canUseCloudFeatures()` may still enable cloud KI/TTS while profile is `local`.

---

## Local-ready (adapter or LocalBackend)

| Area | Entry |
|------|--------|
| Projects list / CRUD (workspace) | `projectsApiAdapter`, `projects-local.ts` |
| Worlds (synthetic per open project) | `worldsApiAdapter`, `worlds-core.ts` |
| Categories / items (worldbuilding) | `categoriesApi`, `items-api.ts` adapters |
| Timeline structure (acts/sequences/scenes) | `timeline-bundle.ts`, `timeline-structure-adapter.ts`, `timeline-api-v2` local branch |
| Beats | `beats-adapter.ts` → `lib/api/beats-api.ts` facade |
| Timeline characters | `characters-adapter.ts` → `lib/api/characters-api.ts` facade |
| Audio clips (CRUD) | `clips-adapter.ts` → `lib/api/audio-clip-api.ts` facade |
| Shots (CRUD) | `shots-adapter.ts` → `lib/api/shots-api.ts` facade (uploads still cloud) |
| Style guide (read) | `style-guide-adapter.ts` — local empty draft; hybrid when Appwrite JWT present |
| Audio tracks/clips/voices (dropdown, `useAudioTimeline`) | `audio-story-adapter.ts` → `LocalAudioRepository` (SQLite) |
| Project open / SQLite | `LocalBackend`, `LocalProjectOpenGuard`, `src/local/` |
| Assets on disk | `src/local/` + Tauri FS capabilities |
| Jobs (optional) | Sidecar `VITE_SCRIPTONY_SIDECAR_PORT` (default 3765) |
| Local TTS (MVE + scenes) | **Voicebox** (`http://127.0.0.1:17493`) — auto-launches on macOS via `open -a`; Kokoro-Stimmen nur als Voicebox-Presets |

Facade: `src/utils/api.tsx` delegates `projectsApi`, `worldsApi`, `categoriesApi`, `itemsApi` to adapters.

### Local TTS (Voicebox)

**Product rule:** Voicebox is a **headless TTS backend** only. Users configure voices, preview, and generate **entirely in Scriptony** — never in the Voicebox UI. Scriptony auto-starts the service in the background on macOS (`open -gj`). Kokoro-Stimmen laufen **nur** als Voicebox-Presets (`GET /profiles/presets/kokoro`) — kein eigenes Kokoro-Sidecar mehr in Scriptony.

Install once (macOS): `./scripts/install-voicebox-macos.sh` → `/Applications/Voicebox.app`

```bash
# .env.local (optional)
VITE_DEFAULT_VOICE_ENGINE=voicebox   # default when unset
VITE_VOICEBOX_BASE_URL=http://127.0.0.1:17493   # Vite dev proxies via /__voicebox (same-origin CORS)
VITE_VOICEBOX_APP_PATH=/Applications/Voicebox.app
```

**Scriptony UI today:** list/create profiles via REST (`GET/POST /profiles`), assign to characters, preview, scene/MVE TTS via `/generate`. Kokoro-Presets erscheinen in der Stimmenliste wie normale Voicebox-Stimmen.

**Still to build in Scriptony** (API exists, UI stub): clone samples upload (`POST /profiles/{id}/samples`), model download status, tuned voices — see Voicebox OpenAPI at `http://127.0.0.1:17493/docs`.

See `src/lib/config/voice-engine.ts`.

---

## Hybrid-only (explicit gates, no silent `__dev-proxy` for domain CRUD)

| Feature | Gate | Local behavior |
|---------|------|----------------|
| KI Assistant, image cover, TTS | `canUseCloudFeatures()` / `requireCloudAuthToken()` | Toast + disabled UI (`useTtsGeneration`, banners) |
| Style guide write / references / jobs | `canUseCloudStyleGuide()` | `style-guide-job-api` throws with clear message |
| Shot image/audio upload, ripple clips | Cloud paths in `shots-api.ts`, `clips-adapter` | `localNotSupported` or cloud-only helpers |
| OAuth / Appwrite session | Cloud runtime | `LocalAuthAdapter` for desktop-local |
| Editorial `clips-api.ts` (film timeline) | Phase 5+ | Still cloud |

Also: `ScriptonyAssistant`, many `lib/jobs/*`, cloud sync activation.

**To make a feature desktop-native:** add a local branch in `api-adapter` or a `LocalBackend` repository; do not only deploy a Function.

---

## Tauri filesystem

| Capability | Purpose |
|------------|---------|
| `workspace-fs` | `read_dir` on workspace root (after Rust `allow_directory`) |
| `local-project-fs` | Read/write under `**/*.scriptony/**` |

Configured in `src-tauri/tauri.conf.json`. Before scanning **or creating** a project, code should call `restoreWorkspaceScope()` (see `projects-local.ts`, `useLocalWorkspace.tsx`).

**First run:** `LocalWorkspaceProvider` + `FirstRunWorkspaceGate` require a trusted workspace folder before Projekte. Change later under Settings → Speicher → Lokal.

**Error `fs.read_dir not allowed`:** missing capability, workspace not registered, or Docker/web dev instead of Tauri.

---

## Checks (desktop tickets)

```bash
@ecc-check
# or manually:
npm run verify -- --frontend
```

Include backend verify when changing `functions/`: `npm run verify -- --backend`.

Legacy full gate (Appwrite deploy): `npm run checks`. Include `src-tauri/` in scope when changing Rust, capabilities, or `tauri.conf.json`.

---

## When to use Appwrite again

- Browser / hosted cloud client testing → `npm run dev:vite`, `VITE_SCRIPTONY_RUNTIME=cloud`
- Function or collection changes → `functions/`, deploy scripts, `GETTING_STARTED` Options A/B
- Hybrid KI/TTS on desktop → keep `VITE_APPWRITE_*` + function domain map; optional sync (T40)

---

**See also:** [FEATURE_LOCAL_CLOUD_MATRIX.md](FEATURE_LOCAL_CLOUD_MATRIX.md) (Lokal / Appwrite / API pro Feature), [LOCAL_PROJECT_FORMAT.md](LOCAL_PROJECT_FORMAT.md), [GETTING_STARTED.md](GETTING_STARTED.md)
