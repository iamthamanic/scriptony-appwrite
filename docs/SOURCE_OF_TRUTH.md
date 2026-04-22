# Scriptony — Source of Truth

Human-oriented map for new contributors (German): [ENTWICKLER_HANDBUCH.md](ENTWICKLER_HANDBUCH.md).

## Production architecture

| Layer                            | Source of truth                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Identity & Appwrite platform** | **Appwrite** (users, sessions, OAuth redirects)                                                  |
| **Application data & uploads**   | **Appwrite Databases + Storage**, accessed only from **deployed `functions/*`** (server API key) |
| **Frontend**                     | **Vite** static build (`npm run build` → `build/`), e.g. Vercel or any static host               |

The browser talks to:

- **Appwrite** via `VITE_APPWRITE_ENDPOINT` + `VITE_APPWRITE_PROJECT_ID` (see `src/lib/appwrite/client.ts`, `AppwriteAuthAdapter`).
- **Scriptony functions** via `VITE_APPWRITE_FUNCTIONS_BASE_URL` or `VITE_BACKEND_API_BASE_URL` and `src/lib/api-gateway.ts` (`scriptony-projects`, `scriptony-auth`, …).

## Repository map

| Path                            | Role                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| **`functions/`**                | HTTP handlers; shared GraphQL-shaped layer in `functions/_shared/` maps to Appwrite |
| **`src/`**                      | SPA                                                                                 |
| **`.env.local.example`**        | Frontend env template                                                               |
| **`docker-compose.yml`**        | Local **Appwrite** stack (`include` → `infra/appwrite/`)                            |
| **`docker-compose.legacy.yml`** | Optional Postgres + Lucia (`profile: local-dev`)                                    |

## Frontend environment (build-time `VITE_*`)

Required for auth: `VITE_APPWRITE_ENDPOINT`, `VITE_APPWRITE_PROJECT_ID`.

Required for API calls: `VITE_APPWRITE_FUNCTIONS_BASE_URL` or `VITE_BACKEND_API_BASE_URL` (base URL that prefixes `/scriptony-<service>/...`).

Also set redirect URLs: `VITE_APP_WEB_URL`, `VITE_AUTH_REDIRECT_URL`, `VITE_PASSWORD_RESET_REDIRECT_URL` (port **3000** in this repo’s Vite config).

Verify: `npm run verify:test-env` (reads `.env.local`).

## CI

See `.github/workflows/ci.yml`. Adjust deploy jobs to match your hosting (static frontend + separately deployed functions on Appwrite Cloud or self-hosted).
