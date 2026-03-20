# Scriptony App

Design reference: [Figma — Scriptony App](https://www.figma.com/design/JAb6EMCafJJlDiwV0Rt8na/Scriptony-App).

## Architecture (single source of truth)

**Read first:** [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md) — production backend is **Nhost (self-hosted)** with Hasura inside; optional Docker stack is **local-dev only** (`docker compose --profile local-dev`).

**Exact commands (server, CI, app):** [docs/EXACT_STEPS.md](docs/EXACT_STEPS.md)

## Run locally (frontend)

```bash
npm install
npm run dev
```

Copy **`.env.local.example`** → **`.env.local`** (Nhost-URLs auf euren Server zeigen lassen).

**Testumgebung (Frontend auf dem Mac, Auth/DB auf dem VPS):** nach dem Start **`npm run verify:test-env`** — siehe [docs/TEST_ENV_REMOTE_NHOST.md](docs/TEST_ENV_REMOTE_NHOST.md).

Weitere Env-Hilfen: `npm run env:local`, [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Build

```bash
npm run build
```

Output: `build/` — see `vercel.json` and `easyploy.json`.

## Docker (optional local dev only)

```bash
npm run docker:local-dev:up    # Postgres + Hasura + Lucia auth
npm run docker:local-dev:verify
npm run docker:local-dev:down
```

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/EXACT_STEPS.md](docs/EXACT_STEPS.md) | **Exact commands** (server, CI, app) |
| [docs/TEST_ENV_REMOTE_NHOST.md](docs/TEST_ENV_REMOTE_NHOST.md) | **Mac + VPS Nhost** (was wohin geht, `verify:test-env`) |
| [docs/HOSTINGER_CONSOLE_COMMANDS.md](docs/HOSTINGER_CONSOLE_COMMANDS.md) | **Copy-Paste SSH** auf Hostinger: Schema + Hinweis Hasura |
| [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md) | **Canonical** deploy & backend model |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Nhost, Vercel, env checklist |
| [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) | Own server + Nhost self-hosted URLs |
