# Scriptony App

Design reference: [Figma — Scriptony App](https://www.figma.com/design/JAb6EMCafJJlDiwV0Rt8na/Scriptony-App).

## Architecture (single source of truth)

**Read first:** [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md) — production backend is **Nhost (self-hosted)** with Hasura inside; optional Docker stack is **local-dev only** (`docker compose --profile local-dev`).

## Run locally (frontend)

```bash
npm install
npm run dev
```

Copy `.env.example` → `.env.local` (or use `npm run env:local` — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

## Build

```bash
npm run build
```

Output: `build/` — see `vercel.json` and `easyploy.json`.

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md) | **Canonical** deploy & backend model |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Nhost, Vercel, env checklist |
| [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) | Own server + Nhost self-hosted URLs |
