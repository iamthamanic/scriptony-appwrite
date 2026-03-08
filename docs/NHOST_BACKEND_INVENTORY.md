## Scriptony Backend Inventory

This file captures the current migration surface from the deleted Supabase setup
to the new Nhost target.

### Auth

- Frontend auth contract lives in `src/lib/auth/AuthClient.ts`.
- The app state and auth UX live in `src/hooks/useAuth.tsx`.
- Provider implementations now exist for:
  - `src/lib/auth/SupabaseAuthAdapter.ts`
  - `src/lib/auth/NhostAuthAdapter.ts`

### Frontend API Transport

- Shared request layer: `src/lib/api-client.ts`
- Route-to-function router: `src/lib/api-gateway.ts`
- Legacy wrapper used by older pages: `src/utils/api.tsx`

### Media And Storage

- Image upload helpers: `src/lib/api/image-upload-api.ts`
- Shot image/audio helpers: `src/lib/api/shots-api.ts`
- Storage usage helper: `src/utils/storage.tsx`

### Core Backend Domains

- Projects: `src/supabase/functions/scriptony-projects`
- Timeline nodes: `src/supabase/functions/scriptony-project-nodes`
- Timeline/shots: `src/supabase/functions/scriptony-timeline-v2`
- Characters: `src/supabase/functions/scriptony-characters`
- Worlds: `src/supabase/functions/scriptony-worldbuilding`
- Beats: `src/supabase/functions/scriptony-beats`
- Inspiration: `src/supabase/functions/scriptony-inspiration`
- Stats/logs/admin: `src/supabase/functions/scriptony-stats`, `scriptony-logs`, `scriptony-superadmin`
- AI/audio: `src/supabase/functions/scriptony-assistant`, `scriptony-audio`

### Migration Notes

- Auth is now provider-selectable through `src/lib/env.ts`.
- Direct Supabase function URL construction in the frontend has been replaced
  with provider-neutral helpers built on top of `backendConfig.functionsBaseUrl`.
- Capacitor bootstrapping now exists, but native app shells still need to be
  generated with `npx cap add ios` / `npx cap add android`.
