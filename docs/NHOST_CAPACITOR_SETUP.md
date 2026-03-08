## Nhost + Capacitor Setup

### 1. Environment

Copy `.env.example` to `.env.local` and fill in the Nhost values:

- `VITE_BACKEND_PROVIDER=nhost`
- `VITE_BACKEND_API_BASE_URL`
- `VITE_NHOST_AUTH_URL`
- `VITE_NHOST_STORAGE_URL`
- `VITE_NHOST_GRAPHQL_URL`
- `VITE_NHOST_FUNCTIONS_URL`
- `VITE_NHOST_SUBDOMAIN`
- `VITE_NHOST_REGION`

### 2. Auth Redirects

Web redirect defaults:

- OAuth: `http://localhost:5173`
- Password reset: `http://localhost:5173/reset-password`

Native redirect defaults:

- `scriptony://auth-callback`
- `scriptony://auth-callback/reset-password`

### 3. Capacitor

The repo now includes:

- `capacitor.config.ts`
- `@capacitor/core`
- `@capacitor/app`
- `@capacitor/preferences`
- `@capacitor/cli`
- `functions/` for Nhost-compatible backend routes
- `nhost/nhost.toml` for Node runtime selection

To add native shells later:

```bash
npx cap add ios
npx cap add android
npm run build
npm run cap:sync
```

### 4. Session Persistence

- Nhost still uses browser-local storage in the web app.
- On Capacitor, `src/lib/capacitor/platform.ts` hydrates and mirrors the
  `nhostSession` value into native `Preferences`.
- Deep links are forwarded into the web app through `appUrlOpen`.

### 5. Backend Expectations

The frontend now expects a provider-neutral function host.

For Nhost, expose the same route surface through your Nhost functions layer:

- `/signup`
- `/projects`
- `/nodes`
- `/shots`
- `/characters`
- `/worlds`
- `/beats`
- `/inspirations`
- `/ai`
- `/stats`
- `/logs`
- `/superadmin`

This preserves the existing UI API shape while the backend is migrated in place.

Current scaffold status:

- Implemented in `functions/`: auth, profile, organizations, projects, nodes, shots, worlds, categories, items, beats, assistant, audio, stats, logs, superadmin, and minimal legacy compatibility routes.
- Media uploads now use Nhost Storage and keep returning URLs so the current UI contract stays stable.
- Still placeholder-only: the old runtime migration utilities.
