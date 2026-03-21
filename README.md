# Scriptony App

Design reference: [Figma — Scriptony App](https://www.figma.com/design/JAb6EMCafJJlDiwV0Rt8na/Scriptony-App).

## Architecture

**Read first:** [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md) — **Appwrite** (auth + data platform) and deployte **`functions/`** HTTP services.

**Self-hosted & codebase orientation:** [docs/ENTWICKLER_HANDBUCH.md](docs/ENTWICKLER_HANDBUCH.md), [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md), [docs/SERVER_ROLLOUT.md](docs/SERVER_ROLLOUT.md), [docs/DEVOPS_EMPFEHLUNG.md](docs/DEVOPS_EMPFEHLUNG.md), [docs/GITHUB_ACTIONS_DEPLOY.md](docs/GITHUB_ACTIONS_DEPLOY.md), [infra/appwrite/README.md](infra/appwrite/README.md).

**Exact commands:** [docs/EXACT_STEPS.md](docs/EXACT_STEPS.md)

## Run locally (frontend)

```bash
npm install
npm run dev
```

Copy **`.env.local.example`** → **`.env.local`** and set `VITE_APPWRITE_*` plus functions base URL.

**Checks:** `npm run verify:test-env` (reads `.env.local`).

More: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), `npm run env:local`.

## Build

```bash
npm run build
```

Output: `build/` — see `vercel.json` and `easyploy.json`.

## Docker (optional local backend)

- **Appwrite** (matches `infra/appwrite/`): `npm run docker:appwrite:up` → Traefik on **8080**; copy `infra/appwrite/.env.example` → `infra/appwrite/.env` first.
- **Legacy** Postgres + GraphQL console + Lucia auth: `npm run docker:local-dev:*` (uses `docker-compose.legacy.yml`; **8080** conflicts with Appwrite if both run).

```bash
npm run docker:appwrite:up
npm run docker:appwrite:verify
npm run docker:appwrite:down
```

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/EXACT_STEPS.md](docs/EXACT_STEPS.md) | Local dev steps |
| [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md) | Canonical architecture |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Env vars, Vercel, security |
| [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) | Own hosting |
| [functions/README.md](functions/README.md) | Backend functions + `APPWRITE_*` |
