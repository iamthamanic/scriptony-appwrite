# Deployment notes

## Frontend (e.g. Vercel)

Set build-time environment variables:

| Variable | Purpose |
|----------|---------|
| `VITE_APPWRITE_ENDPOINT` | Appwrite API base (`…/v1`) |
| `VITE_APPWRITE_PROJECT_ID` | Project ID |
| `VITE_APPWRITE_FUNCTIONS_BASE_URL` or `VITE_BACKEND_API_BASE_URL` | Path-style gateway: `{BASE}/scriptony-projects/...` (not the same as `VITE_APPWRITE_ENDPOINT` unless you proxy) |
| `VITE_BACKEND_FUNCTION_DOMAIN_MAP` | One-line JSON: `{ "scriptony-projects": "https://…", … }` — each value is the function’s HTTP domain from Appwrite (Console → Functions → Domains). Prefer this for Appwrite-hosted functions. |
| `VITE_APP_WEB_URL` | Public site URL |
| `VITE_AUTH_REDIRECT_URL` | OAuth/email redirect origin |
| `VITE_PASSWORD_RESET_REDIRECT_URL` | Password recovery return URL |
| `VITE_BACKEND_PUBLIC_TOKEN` | Optional; some routes accept an extra public token |

Redeploy after changing `VITE_*`.

## Appwrite

Configure **Authentication → URLs** (or equivalent) so redirects match production and local dev origins.

## Functions

Deploy the contents of **`functions/`** per function to your runtime (Appwrite Functions, Node host, etc.). Each function expects **server-side** `APPWRITE_*` variables and optional bucket/database IDs — see `functions/_shared/env.ts`.

**KI / Assistant (`scriptony-assistant`):** If the app shows **Cannot connect to scriptony-assistant** or **Failed to fetch** on `/ai/settings`, the function is usually not deployed or the HTTP domain is not bound. From the repo (after `npx appwrite-cli login` and `appwrite init project`):

```bash
npm run appwrite:setup:assistant
```

This creates the function in Appwrite if it does not exist, then deploys the bundle (same as `npm run appwrite:deploy:assistant` alone). Then **Console → Functions → scriptony-assistant → Domains** must match the host in `VITE_BACKEND_FUNCTION_DOMAIN_MAP`; use `npm run appwrite:sync:function-domains` (`.env.server.local` + API key) to refresh `.env.local`. Confirm with `npm run verify:test-env`.

## Parity Check

For release-relevant parity between local env, live Appwrite functions, and real auth-protected flows:

```bash
npm run verify:parity
```

The script verifies separately:

- Appwrite API reachability
- live deployment status of critical functions
- critical server-side `APPWRITE_*` vars on those functions
- browser routing from `.env.local`
- `/health` per critical function
- one auth-protected real-flow per critical service

For auth-protected smoke checks, provide a bearer token in `.env.server.local` or the shell:

```bash
SCRIPTONY_SMOKE_BEARER_TOKEN=... npm run verify:parity
```

Use `npm run verify:parity -- --require-auth` to fail if the auth-smoke token is missing.

## Smoke Matrix

For a fixed matrix of real user reads, use:

```bash
npm run smoke:user-flows
```

This script is stricter than `verify:parity`:

- auth token is mandatory
- it checks a fixed user-flow matrix
- it covers `Projects`, `Worldbuilding`, and AI reads

To run the same matrix through the local Vite dev proxy instead of direct function domains:

```bash
npm run smoke:user-flows -- --mode=dev-proxy --frontend-origin=http://127.0.0.1:3000
```

To print the matrix without executing requests:

```bash
npm run smoke:user-flows -- --list
```

See [docs/SMOKE_TEST_MATRIX.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/SMOKE_TEST_MATRIX.md) for the exact flow list.

## Security

- Never put Appwrite API keys or function admin secrets in `VITE_*`.
- Rate-limit and authenticate public HTTP entrypoints in production.
