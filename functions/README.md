# Scriptony HTTP functions (Appwrite)

This directory contains deployable HTTP handlers (`scriptony-*`, `make-server-3b52693b`, …). They talk to **Appwrite** (Databases + Storage) using the server API key. Route code often still uses **GraphQL-shaped query strings** for readability; those are parsed and dispatched via [`_shared/graphql-compat.ts`](_shared/graphql-compat.ts) — there is **no** Hasura or remote GraphQL server in production.

## Required environment (server)

See [`_shared/env.ts`](_shared/env.ts):

- `APPWRITE_ENDPOINT` — e.g. `https://cloud.appwrite.io/v1` or self-hosted `/v1`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY` — API key with access to the database and buckets you use

Optional:

- `APPWRITE_DATABASE_ID` (default `scriptony`)
- `SCRIPTONY_STORAGE_BUCKET_*` — override default bucket IDs
- `scriptony_oauth_*` — storage-provider OAuth (see [docs/STORAGE_OAUTH_SETUP.md](../docs/STORAGE_OAUTH_SETUP.md))
- `SCRIPTONY_DEMO_EMAIL` / `SCRIPTONY_DEMO_PASSWORD` / `SCRIPTONY_DEMO_NAME` — demo user helpers

## Provisioning the Databases schema

From the **repo root** (with `APPWRITE_API_KEY` and endpoint/project in `.env` / `.env.local` / `.env.server.local`, or `VITE_APPWRITE_*` for endpoint/project):

```bash
npm run appwrite:provision:schema
```

This runs [`tools/provision-appwrite-schema.mjs`](tools/provision-appwrite-schema.mjs): creates database `scriptony` (if missing), all collections listed in `_shared/appwrite-db.ts`, attributes, and basic indexes. Safe to re-run (skips existing resources). It does **not** create Messaging topics or Sites — only **Databases (legacy)**.

### Storage buckets (defaults)

From repo root (needs API key with **storage** scopes, e.g. `storage.buckets.read` / `storage.buckets.write`):

```bash
npm run appwrite:provision:buckets
```

Runs [`tools/provision-appwrite-buckets.mjs`](tools/provision-appwrite-buckets.mjs): ensures buckets `general`, `project-images`, `world-images`, `shots`, `audio-files` (same defaults as `_shared/env.ts`). Safe to re-run.

## Layout

- `_shared/graphql-compat.ts` — `requestGraphql()` → `dispatchGraphqlOperation`
- `_shared/graphql-operations/` — operation name → Appwrite-backed handler
- `_shared/appwrite-db.ts` — Databases client and collection IDs
- `_shared/auth.ts` — JWT user resolution (Appwrite Account API)
- `_shared/storage.ts` — Appwrite Storage uploads

## Deploy a single function (example: `scriptony-shots`)

After `npx appwrite-cli login` and a linked project, from the **repo root**:

```bash
npm run appwrite:deploy:shots
```

The deploy script runs **esbuild** from `functions/`: it bundles `scriptony-shots/index.ts`, all of `_shared`, and `node-appwrite` into **one** `index.js` (CommonJS, Node 16–compatible). The deployment upload contains only that file; **`--entrypoint index.js`**. Appwrite’s Node runtime does not run `.ts` entry files — deploying TS sources leads to immediate worker failure → **503** and an HTML error page **without** CORS headers, which browsers report as a CORS / `Failed to fetch` error.

Ensure the function’s active deployment entrypoint in the Console is **`index.js`** after you deploy (the CLI sets it per deployment).

### Deploy `scriptony-ai` (KI & LLM, `/ai/*`, central AI control plane)

Required for **Einstellungen → Integrationen → KI & LLM** and any route under `/ai/*` in the SPA.

From the **repo root** (same CLI login as above):

```bash
npm run appwrite:deploy:ai
```

Then in **Appwrite Console → Functions → scriptony-ai → Domains**, attach the HTTP URL that matches `VITE_BACKEND_FUNCTION_DOMAIN_MAP` (`"scriptony-ai": "https://…"`). Without a deployment **and** a domain, `/health` returns HTML/404 and the browser shows **Failed to fetch**.

Verify: `npm run verify:parity -- --require-auth` and `npm run smoke:user-flows`.

### Deploy `scriptony-image` (Image-Key + Cover-Generierung)

Routes:
- `POST /ai/image/validate-key`
- `POST /ai/image/generate-cover`

From the repo root:

```bash
npm run appwrite:deploy:image
```

Then ensure `"scriptony-image":"https://…"` exists in `VITE_BACKEND_FUNCTION_DOMAIN_MAP` (or run `npm run appwrite:sync:function-domains`) and restart Vite.

**First-time / self-hosted (CLI logged in):** create if missing + deploy in one step:

```bash
npm run appwrite:setup:assistant
```

Then attach the function’s HTTP domain in the Console and sync into Vite: `npm run appwrite:sync:function-domains` (needs `.env.server.local` with `APPWRITE_API_KEY`).

### Deploy `scriptony-mcp-appwrite` (internal MCP-style capabilities)

Thin HTTP host for deterministic tools (`src/scriptony-mcp` + `src/scriptony-runtime`). Routes: `GET /health`, `POST /invoke` (body: `action`: `list_tools` | `invoke`, optional `tool`, `input`, `approved`, `project_id`).

From repo root (CLI login as for other functions):

```bash
npm run appwrite:deploy:mcp
```

Add `"scriptony-mcp-appwrite":"https://…"` to `VITE_BACKEND_FUNCTION_DOMAIN_MAP` so the SPA can call `/scriptony-mcp/…` via [`src/lib/api-gateway.ts`](../src/lib/api-gateway.ts). Verify: `npm run verify:test-env` includes this function’s `/health` when the URL is derivable; `npm run verify:functions-cli` logs MCP health but only fails on assistant errors.

## Further reading

- [docs/SOURCE_OF_TRUTH.md](../docs/SOURCE_OF_TRUTH.md)
- [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)
