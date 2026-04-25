# Scriptony Architecture Refactor Master

Stand: 2026-04-26

Dieses Dokument enthält die Master-Konfiguration und Shimwrappercheck-Gates.
Ziel-Domänen sind in `docs/architecture-refactor-domains.md` ausgelagert.
Done Reports sind in `docs/architecture-refactor-done-reports.md` ausgelagert.

---

## Shimwrappercheck Gate

Jeder Agent muss nach Abschluss eines Tickets im Done-Report-Dokument dokumentieren, was umgesetzt wurde.

### Default Gate Fuer Normale Tickets

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Wenn der Worktree unrelated Aenderungen enthaelt:
```bash
SHIM_CHANGED_FILES="path/a.ts,path/b.md" CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Aktive Kernchecks: Frontend Format/Lint, TypeScript, Vite Build, Vitest, Function Format/Lint/Build, Gitleaks, Shellcheck, Architecture, AI Review.

### Backend-Only Gate
```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend
```

### Frontend-Only Gate
```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend
```

### Full Refactor Checkpoint
```bash
CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor
```

### Release/Deploy Gate
```bash
SHIM_RUN_NPM_AUDIT=1 CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor
npm run verify:test-env
npm run verify:functions-cli
npm run verify:parity
npm run smoke:user-flows
```

Echter Deploy ueber den shim:
```bash
npx shimwrappercheck run --cli appwrite -- functions deploy <name>
```

### Runtime-Entscheidung

- Appwrite Functions: Node Runtime mit esbuild (`node-16.0`).
- `SHIM_RUN_DENO_FMT=0`, `SHIM_RUN_DENO_LINT=0`, `SHIM_RUN_DENO_AUDIT=0`.
- `functions/**/index.js` sind Build-Artefakte.

### UI/UX Check-Regeln

Bei UI-Aenderungen dokumentieren: verwendete Komponenten/Patterns, keine raw Appwrite-Calls, React Query-Regeln, keine Hex-Farben, Browser-/Screenshot-Checks.

---

## Done Report Vorlage

Siehe `docs/architecture-refactor-done-reports.md`.

---

## Neue Ziel-Domaenen

Siehe `docs/architecture-refactor-domains.md`.

---

## Zielarchitektur (Aktualisiert)

| Gruppe | Functions |
| --- | --- |
| Core | `scriptony-auth`, `scriptony-projects`, `scriptony-structure`, `scriptony-script`, `scriptony-characters`, `scriptony-worldbuilding`, `scriptony-timeline`, `scriptony-editor-readmodel` |
| Media | `scriptony-assets`, `scriptony-audio`, `scriptony-image`, `scriptony-video`, `scriptony-media-worker` |
| Workflows | `scriptony-audio-production`, `scriptony-stage`, `scriptony-stage2d`, `scriptony-stage3d`, `scriptony-style`, `scriptony-style-guide`, `scriptony-sync`, `scriptony-gym` |
| Platform | `scriptony-ai`, `scriptony-assistant`, `scriptony-jobs`, `scriptony-observability`, `scriptony-admin`, `scriptony-mcp-appwrite`, `scriptony-storage`, `scriptony-collaboration` |
| Legacy | `jobs-handler`, `make-server-3b52693b` |

---

## Done Reports

Siehe `docs/architecture-refactor-done-reports.md`.
