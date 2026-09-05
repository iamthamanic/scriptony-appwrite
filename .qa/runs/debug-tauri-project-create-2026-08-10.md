# Debug Report — `tauri-project-create`

**Date:** 2026-08-10  
**Project:** scriptony-multihost  
**Shell:** tauri  
**Repro grade:** not-reproduced (live UI) — **static/code path: high confidence**  
**tauri-native-layer:** yes (workspace pick/`invoke`/`plugin-fs` required; Vite browser alone is insufficient)

---

## Summary

Local project create fails because no workspace root is ever configured: `FirstRunWorkspaceGate` / `LocalWorkspaceProvider` / `LocalStorageProviderPanel` exist but are **not mounted or wired** into the app, so `createLocalProject` throws “Kein Workspace…”, while the UI only shows a generic toast.  
**Confidence:** high (wiring gap proven by repo-wide import search + create path + toast swallow)

---

## Bug description

| | |
|--|--|
| **Expected** | In Tauri desktop (`npm run dev:desktop` / local profile), user can create a `.scriptony` project under a chosen workspace folder. First run should prompt for a workspace (T44/T59); Settings → Speicher should allow picking/changing it. |
| **Actual** | User sees an error when creating a project (German report: „fehler beim erstellen des projekts“). Toast text matches the generic catch: `Fehler beim Erstellen des Projekts`. |
| **Steps** | 1. Start Tauri desktop (`dev:desktop`). 2. Open Projekte. 3. Create new project (title + ≥1 genre). 4. Confirm → error toast. |
| **Assumptions** | User is on local desktop profile; no prior trusted workspace root in app data (`workspace-root.txt`); report refers to create-dialog failure, not post-create narrative/beats setup. |

---

## Reproduction

- **Command / URL:** `.qa/project.yaml` → `devCommand: npm run dev:desktop`, `devUrl: http://localhost:3000` (Vite for Tauri WebView only)
- **Playwright spec:** none created (native FS/`invoke` path; browser MCP on :3000 is partial and currently not Scriptony)
- **Result:** live UI not reproduced this session
- **Hard path:** no
- **Why not live-repro:**
  - Terminal `624261`: `dev:desktop` built and started Scriptony, then session ended (`exit_code: unknown`)
  - Terminal `1`: earlier `dev:desktop` failed because port **3000** was held by Docker (`com.docke`)
  - At investigation time: **nothing listening on :3000**; `:3000` previously conflicted with `supabase_studio_src` (maps host 54323→3000 in docker ps — separate from Scriptony Vite). Cursor browser MCP against :3000 would not be a valid Tauri native repro.

---

## Evidence

### Console / runtime (expected at failure)

```
Error creating project: Error: Kein Workspace-Ordner gewählt. Bitte unter Einstellungen → Speicher einen Workspace festlegen.
```

(logged in `ProjectsPage.handleCreateProject` catch; user-facing toast does **not** include this message)

### Network

| Method | URL | Status | Note |
|--------|-----|--------|------|
| — | — | — | Local create does not use cloud `POST /projects` when `isLocalProfile() && isDesktopShell()` (`dispatchByRuntime` → `createLocalProject`) |

### Screenshot / trace

- None (dev stack not healthy for Scriptony WebView during this debug pass)

### Tauri native

```
# Create path (local):
ProjectsPage.handleCreateProject
  → projectsApi.create (= projectsApiAdapter.create)
  → createLocalProject (projects-local.ts)
  → getWorkspaceRoot() via invoke("get_stored_workspace_root")
  → if null: throw "Kein Workspace-Ordner gewählt…"
  → else LocalProjectContext.create → createProjectFolder (plugin-fs mkdir/write + sql.js)

# Workspace pick (Rust) exists but is unreachable from UI:
pick_workspace_folder → allow_workspace_directory + persist_trusted_root
```

Capabilities involved (would matter **after** workspace is set): `workspace-fs`, `local-project-fs` in `src-tauri/tauri.conf.json`.

### Code facts (smoking gun)

1. **`LocalWorkspaceProvider` is never mounted** in `src/App.tsx` (providers: Runtime / LocalProject / Backend / Auth / … — no workspace provider).
2. **`FirstRunWorkspaceGate` has zero importers** outside its own file — never shown in `AppContent`.
3. **`LocalStorageProviderPanel` has zero importers** — Settings → Speicher (`StorageSettingsSection`) does **not** render the workspace picker panel (despite create error text pointing there).
4. Repo-wide: no historical commit ever added `<LocalWorkspaceProvider` / `import { LocalWorkspaceProvider` into App tree (git `-S` search).
5. Tickets claim wiring that is missing: `tickets/done-T44-…`, `tickets/done-T59-…` (“Routing in App.tsx / AppContent.tsx”, “FirstRunWorkspaceGate beim ersten Start”).
6. UX mask: `ProjectsPage.tsx` catch always toasts `"Fehler beim Erstellen des Projekts"` and drops `error.message`.

Secondary (only if a root *were* persisted without UI):

- `listLocalProjects` / `getLocalProject` call `restoreWorkspaceScope()`; **`createLocalProject` does not** — FS scope may be stale after restart → possible `path not allowed` / mkdir failure under `createProjectFolder`.
- `local-project-fs` mkdir/write allowlists only `$HOME` / `$DOCUMENT` / `$DESKTOP` / `$DOWNLOAD` `**/*.scriptony` trees — workspace outside those roots can still fail after pick.

---

## Prior art

- [x] Repo grep: `createLocalProject` / `FirstRunWorkspaceGate` / `LocalWorkspaceProvider` / toast string — confirmed disconnect
- [x] Tickets: `done-T44-implementation-desktop-workspace-local-first.md`, `done-T59-implementation-local-cloud-ui-parity-projects.md` — document intended gate; code does not implement mount
- [x] Docs: `docs/DESKTOP_FIRST_DEV.md` § Tauri filesystem — requires workspace + `restoreWorkspaceScope()`; `.qa/edge-cases.md` **G-02** Workspace gate
- [ ] GitHub issue (scriptony-multihost): no matching open issue for this create/workspace-gap symptom in recent list (MVE-focused)
- [ ] LightRAG: not used
- [ ] Ledger / `.qa/debug-log.md`: none present

---

## Root cause

**Layer:** UI wiring + local adapter (with Tauri native dependency).

Desktop local project creation **requires** a trusted workspace root persisted by Rust (`pick_workspace_folder` / `workspace-root.txt`). The T44 UI pieces that collect that root (`LocalWorkspaceProvider`, `FirstRunWorkspaceGate`, `LocalStorageProviderPanel`) were implemented as modules but **never connected** to `App` / `AppContent` / Settings Speicher. Users reach `ProjectsPage` create without a workspace → `createLocalProject` throws → generic toast.

This is not primarily an SQLite schema bug or a missing `fs:allow-mkdir` for a configured workspace; those layers are not reached when `getWorkspaceRoot()` is null.

**Hypotheses tested (static):**  
1. No workspace root → matches create throw — **supported**.  
2. Genre validation only — different toast (“mindestens ein Genre”) — **rejected** as sole cause.  
3. Cloud POST failure — local desktop uses `createLocalProject` — **rejected** as primary.  
4. Capability mkdir deny — only after root exists — **secondary**.

**Fix attempts this bug:** 0 (debug-only; Iron Law)

---

## Suggested fix (minimal) — HINT ONLY, do not implement here

1. **Files:** `src/App.tsx`, `src/components/AppContent.tsx`, `src/components/settings/StorageSettingsSection.tsx` (or dedicated local branch of Speicher UI), existing `src/hooks/useLocalWorkspace.tsx`, `src/components/desktop/FirstRunWorkspaceGate.tsx`, `src/components/settings/LocalStorageProviderPanel.tsx`
2. **Change:**
   - Mount `LocalWorkspaceProvider` in the App provider tree (desktop/local).
   - Gate local desktop with `FirstRunWorkspaceGate` when `!workspaceRoot` (per T44/T59).
   - Render `LocalStorageProviderPanel` under Settings → Speicher when local desktop so the error’s “Einstellungen → Speicher” path works.
   - Optional but recommended: `await restoreWorkspaceScope()` at start of `createLocalProject`; surface `error.message` in the create toast.
3. **Regression test:** unit/integration that create without root surfaces workspace error; UI/e2e or smoke that provider is mounted and gate appears when root missing; after pick, create succeeds under a temp workspace (Tauri or mocked invoke/fs).

**Next step:** `@implement`

---

## Notes

- **Assumptions:** User error matches generic create toast; no workspace previously registered via older builds/manual invoke.
- **Out of scope:** Implementing the fix; full Tauri live repro once port 3000 is free of non-Scriptony listeners; post-create narrative auth toasts (`applyProjectCreateSetup`) — separate symptom if create itself succeeds.
- **Dev hygiene:** Prefer `docker stop scriptony-frontend` and ensure nothing else owns **3000** before `npm run dev:desktop` (see terminal evidence of port conflicts).
