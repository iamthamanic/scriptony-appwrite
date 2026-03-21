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

## Layout

- `_shared/graphql-compat.ts` — `requestGraphql()` → `dispatchGraphqlOperation`
- `_shared/graphql-operations/` — operation name → Appwrite-backed handler
- `_shared/appwrite-db.ts` — Databases client and collection IDs
- `_shared/auth.ts` — JWT user resolution (Appwrite Account API)
- `_shared/storage.ts` — Appwrite Storage uploads

## Further reading

- [docs/SOURCE_OF_TRUTH.md](../docs/SOURCE_OF_TRUTH.md)
- [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)
