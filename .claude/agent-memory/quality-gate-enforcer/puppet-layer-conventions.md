---
name: Puppet-Layer Frontend Conventions
description: Patterns and conventions used in the Puppet-Layer frontend integration (render jobs, freshness, stage API)
type: project
---

## Version-pinned imports
- The project uses `sonner@2.0.3` as import path (aliased via tsconfig paths + vite resolve.alias to actual sonner package). 30+ files use this pattern. NOT a per-ticket issue.
- Same pattern exists for `wavesurfer.js@7.8.10`, `vaul@1.1.2`, `recharts@2.15.2`, `lucide-react@0.487.0`, etc.

## Cross-boundary imports
- `functions/_shared/freshness.ts` is imported directly from `src/` (e.g., `useFreshness.ts`). This is by design -- the freshness module is documented as shared between backend and frontend. tsconfig.json includes it in the `include` array.
- Frontend types (`src/lib/types/index.ts`) should re-export from shared modules rather than re-declaring duplicate types. Fixed during Ticket 12 review.

## API client pattern
- `src/lib/api-client.ts` provides `apiGet/apiPut/apiPost` returning `ApiResult<T>` (success/error wrapper).
- `src/lib/api-gateway.ts` also exports `apiGet/apiPut/apiPost` but with DIFFERENT signatures (returning raw `T`).
- New API modules (stage-api.ts, freshness-api.ts) correctly import from `api-client` and use `unwrapApiResult`.

## React Query conventions
- Query keys follow a factory pattern in `src/lib/react-query.ts`: `queryKeys.domain.subKey(params)`.
- Sub-keys should include a descriptive segment (e.g., `["renderJobs", "shot", shotId]` not `["renderJobs", shotId]`).
- Mutations use optimistic updates with proper snapshot rollback and invalidation on settled.

## Route mapping
- `src/lib/api-gateway.ts` uses longest-prefix matching for route resolution.
- New Puppet-Layer routes added: `/stage` -> STAGE, `/sync` -> SYNC, `/ai/stage` -> STAGE, `/ai/sync` -> SYNC.