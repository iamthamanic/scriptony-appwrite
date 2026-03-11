## Nhost Functions

This folder contains the first Nhost-compatible backend surface for Scriptony.

### Current scope

- `scriptony-auth`
  - `GET /health`
  - `POST /signup`
  - `POST /create-demo-user`
  - `GET /profile`
  - `PUT /profile`
  - `GET /organizations`
  - `POST /organizations`
  - `GET /organizations/:id`
  - `PUT /organizations/:id`
  - `DELETE /organizations/:id`
  - `GET /integration-tokens` (list), `POST /integration-tokens` (create), `DELETE /integration-tokens/:id` (revoke)
  - `GET /storage/usage`
- `scriptony-projects`
  - `GET /health`
  - `GET /projects`
  - `POST /projects`
  - `GET /projects/:id`
  - `PUT /projects/:id`
  - `DELETE /projects/:id`
  - `POST /projects/:id/upload-image`
- `scriptony-worldbuilding`
  - `GET /health`
  - `GET /worlds`
  - `POST /worlds`
  - `GET /worlds/:id`
  - `PUT /worlds/:id`
  - `DELETE /worlds/:id`
  - `GET /worlds/:id/categories`
  - `POST /worlds/:id/categories`
  - `GET /worlds/:id/items`
  - `GET /characters?world_id=...`
  - `POST /worlds/:id/upload-image`
- `scriptony-beats`
  - `GET /health`
  - `GET /beats?project_id=...`
  - `POST /beats`
  - `PATCH /beats/:id`
  - `DELETE /beats/:id`
- `make-server-3b52693b`
  - `GET /health`
  - `GET /projects`
  - `POST /projects/:id/recalculate-word-counts` placeholder
  - `POST /migrate` placeholder
  - `POST /migrate-sql` placeholder

### Required Nhost environment

- `NHOST_AUTH_URL`
- `NHOST_GRAPHQL_URL`
- `NHOST_HASURA_URL`
- `NHOST_ADMIN_SECRET`
- `NHOST_STORAGE_URL`

Optional storage bucket overrides:

- `SCRIPTONY_STORAGE_BUCKET_GENERAL`
- `SCRIPTONY_STORAGE_BUCKET_PROJECT_IMAGES`
- `SCRIPTONY_STORAGE_BUCKET_WORLD_IMAGES`
- `SCRIPTONY_STORAGE_BUCKET_SHOT_IMAGES`
- `SCRIPTONY_STORAGE_BUCKET_AUDIO_FILES`

Optional local test vars:

- `SCRIPTONY_DEMO_EMAIL`
- `SCRIPTONY_DEMO_PASSWORD`
- `SCRIPTONY_DEMO_NAME`

### Local workflow

1. Install the Nhost CLI.
2. Run `nhost init` in the project root if the repo is not linked yet.
3. Keep `nhost/nhost.toml`.
4. Start local infra with `nhost up`.
5. Point the frontend `.env.local` to the local Nhost URLs.

### Important migration notes

- Storage uploads now go through Nhost Storage and return presigned URLs.
- File IDs are handled inside the function layer so the existing frontend
  contract can keep using URLs during the migration.
- The old `make-server-3b52693b` runtime migration endpoints are preserved only
  as compatibility stubs.
- These handlers use Hasura admin access internally and enforce app access in
  the function layer by validating the Nhost bearer token first.
