# Agent instructions (scriptony-appwrite)

This file is used by AI agents (Cursor, Codex, Claude, Gemini, etc.) when working with this repo.
It can be edited via the shimwrappercheck dashboard (Config → AGENTS.md) so agents and humans share one source of truth.

## Mandatory workflow (do not bypass)

- **Run checks before push or deploy.** Do not call the real Appwrite deploy or push without going through the checked workflow.
- **Run checks until there are no errors and no warnings.** If any check fails or reports warnings, fix the issues and re-run the checks. Repeat until every check passes with zero errors and zero warnings. Do not push or deploy until all checks are green.
- **If any check fails, fix the reported issues and re-run.** Do not bypass the shim or hooks. Single source of checks: `scripts/run-checks.sh`.
- **Prefer `npm run checks`** (if defined) or run the same steps as the shim. For push: `git push` runs pre-push checks automatically when hooks are installed.

## Shim usage (shimwrappercheck)

- **Appwrite deploy**: Use `npx shimwrappercheck run --cli appwrite -- functions deploy <name>` or `npm run checks` first, then deploy.
- **Git push**: Use `npx git push` or `npm run git:checked -- push` so checks run before push. The pre-push hook runs `scripts/run-checks.sh` when installed.
- **Setup**: Run `npx shimwrappercheck init` for one-time setup; `npx shimwrappercheck install` for PATH shims.
- **Dashboard**: `npx shimwrappercheck dashboard` to configure checks, presets, and this AGENTS.md via UI.

## Checks (what runs in scripts/run-checks.sh)

Checks are configured in the dashboard or `.shimwrappercheckrc` (toggles and order). Current configured checks:

### Frontend

- **ESLint** (`npm run lint`): Catches code quality issues and React hooks violations.
- **TypeScript Check** (`npm run typecheck`): `tsc --noEmit` — catches type errors before runtime.
- **Prettier** (`npm run format:check`): Enforces consistent code formatting.
- **Vitest** (`npm run test`): Unit tests must pass.
- **Vite Build** (`npm run build`): Production build must succeed.
- **npm audit** (`SHIM_RUN_NPM_AUDIT=1 npm run checks` or `npm audit`): Release/security gate only. It is disabled in the default snippet gate because it is not scoped to the changed files and can block unrelated tickets on pre-existing vulnerabilities.

### Backend (Appwrite Functions / Node.js / Hono)

- **Functions format** (`SHIM_RUN_FUNCTIONS_FORMAT=1`): Prettier checks changed Appwrite Function source files in snippet mode and all Function source files in full/refactor mode. Generated bundles such as `functions/**/index.js` are ignored.
- **Functions lint** (`SHIM_RUN_FUNCTIONS_LINT=1`): ESLint checks changed `functions/**/*.ts` files in snippet mode and all Function TypeScript source files in full/refactor mode.
- **Functions build** (`SHIM_RUN_FUNCTIONS_BUILD=1`): Builds changed Appwrite Functions with esbuild in snippet mode and all known Appwrite Functions in full/refactor mode. This is a build-only check; it must not deploy.
- **No Deno default checks**: `SHIM_RUN_DENO_FMT=0`, `SHIM_RUN_DENO_LINT=0`, and `SHIM_RUN_DENO_AUDIT=0` because this repo's Appwrite Functions are bundled for the Appwrite Node runtime.

### Required Shim Commands

- **Normal ticket / changed-code gate**: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`
- **Dirty worktree ticket scope**: If unrelated user changes exist, set `SHIM_CHANGED_FILES` to the current ticket's files, for example `SHIM_CHANGED_FILES="scripts/run-checks.sh,AGENTS.md" CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.
- **Backend-only ticket**: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend`
- **Frontend-only ticket**: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend`
- **Large refactor checkpoint**: `CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor`
- **Release/deploy gate**: Run `SHIM_RUN_NPM_AUDIT=1 CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor`, then the relevant Appwrite verify/smoke scripts before any real deploy.
- **Dependency-change gate**: If `package.json`, package lockfiles, or dependency tooling changed, also run `SHIM_RUN_NPM_AUDIT=1 CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` or document why a known pre-existing vulnerability is out of scope.
- **AI review**: Must stay enabled for ticket completion. Do not pass `--no-ai-review` and do not set `SKIP_AI_REVIEW=1` unless a human explicitly approves an exception.
- **AI provider failures**: Codex usage limits, CLI failures, or missing `VERDICT: ACCEPT` do not count as a passed gate. Keep the ticket open and rerun the same scoped Shim command when the provider is available.

### Currently disabled or conditional

- Deno checks are disabled for the default gate because Functions are Node/Appwrite bundles.
- npm audit, Full Explanation Check, SAST/Semgrep, Snyk, Complexity, Mutation, i18n, and E2E are conditional checks for release, security, dependency, or UI-specific work.
- Gitleaks, Architecture, Shellcheck, and AI Review are controlled via `.shimwrappercheckrc`; missing local tools may skip with an explicit message, but real findings in the changed scope must be fixed before push/deploy.

## Repository structure

- **Frontend**: `src/` — React + Vite + TypeScript + Tailwind + Radix UI
- **Backend (Appwrite Functions)**: `functions/` — Node/Appwrite Functions bundled with esbuild for `index.js` entrypoints (scriptony-ai, scriptony-assistant, scriptony-audio, scriptony-image, scriptony-style, etc.)
- **Shared types / lib**: `src/lib/`, `src/types/`
- **Infrastructure**: `infra/appwrite/` — Docker Compose for local Appwrite
- **Scripts**: `scripts/` — deploy, verify, smoke-test scripts

## Project rules

### Frontend (React/Vite/TypeScript)

- **Use Appwrite SDK** (`src/lib/api/`): All Appwrite calls go through the API layer. No raw `fetch` to Appwrite endpoints in components.
- **React Query** for server state: No direct `fetch`/Axios calls in UI components; use `@tanstack/react-query` hooks.
- **No business logic in components**: Logic in hooks (`src/hooks/`) or services; keep pages and components slim.
- **File and component size**: Max 300 lines per file, max 150 lines per component. Split when exceeding.
- **Explicit types**: Strict TypeScript, no `any` (use `unknown` + type guard if needed). Clear interfaces for props and API responses.
- **Tailwind CSS**: Use Tailwind utility classes; custom values via `tailwind.config.js`. No hardcoded colors (`#hex`) in code — use theme variables.
- **Radix UI primitives**: Use Radix for accessible components (dialogs, dropdowns, etc.). Do not rebuild what Radix provides.
- **Accessibility**: Semantic HTML, keyboard navigation, `aria-label` for icon-only buttons.
- **Error handling**: Always handle loading/error states in UI. Use sonner for toasts. Never swallow errors silently.

### Backend (Appwrite Functions / Node.js / Hono)

- **Hono framework**: All Appwrite functions use Hono for routing. Keep handlers slim; business logic in service files.
- **Module independence**: A function module must not import from other function modules. Shared code lives in `_shared/`.
- **`_shared/` convention**: Shared utilities, types, and services under `functions/_shared/`. Import with relative paths.
- **Environment variables**: All secrets via Appwrite function env vars. Never hardcode API keys or tokens. Use `functions/_shared/env.ts` for env access.
- **Input validation**: Validate all inputs with Zod at the handler level before processing.
- **Error responses**: Use Hono's HTTPException or structured `{ success: false, error: { code, message } }` responses.
- **File size**: Max 300 lines per file (hard limit 500). Split large functions into service modules.
- **Runtime compatibility**: Functions must remain compatible with the Appwrite Node runtime and the esbuild bundling/deploy scripts. Do not introduce Deno-only APIs.
- **Generated bundles**: Treat checked-in `functions/**/index.js` files as generated/deploy artifacts. Do not manually format, lint, or edit them unless the task explicitly updates a legacy bundle workflow.

### Security

- Never expose Appwrite API keys or function secrets in responses or logs.
- Validate and sanitize all user inputs (Zod schemas).
- Do not store tokens in `localStorage` unless required and documented.
- Use Appwrite's built-in auth — do not roll your own auth system.

### Testing

- **Frontend**: `npm run test` (Vitest). Write tests for hooks, utilities, and API layers.
- **Backend**: Use Function service tests where available and the shimmed Appwrite Function build check. Focus on service logic and route contracts, not framework boilerplate.

## Timeouts

If a check runs too long and times out (e.g. AI review or Full Explanation with Codex), increase the timeout as needed:

- AI / Codex checks: Set `SHIM_AI_TIMEOUT_SEC` in `.shimwrappercheckrc` or in the dashboard. Default is often 180 seconds; for large diffs use e.g. `SHIM_AI_TIMEOUT_SEC=300` (5 minutes) or higher. Then re-run the checks.

## README and docs

When you add features, change behavior, or add new options, update the README and relevant docs so they stay in sync.

## Customize below

Add project-specific rules, structure, and conventions so agents follow your repo.
