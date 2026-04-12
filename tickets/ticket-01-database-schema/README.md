# Ticket 1: Database Schema

## Scope

Ticket 1 introduces 5 collections in the main Appwrite database `scriptony`:

1. `styleProfiles`
2. `renderJobs`
3. `imageTasks`
4. `guideBundles`
5. `stageDocuments`

It also extends the existing `shots` collection with:

- `blenderSourceVersion`
- `blenderSyncRevision`
- `guideBundleRevision`
- `styleProfileId`
- `styleProfileRevision`
- `renderRevision`
- `lastBlenderSyncAt`
- `lastPreviewAt`
- `latestGuideBundleId`
- `latestRenderJobId`
- `acceptedRenderJobId`

## Current Status

- Schema deployed in Appwrite database `scriptony`
- All collection attributes and indexes from the JSON specs are present
- All `shots` extension fields are present
- Automated smoke test with real create/delete document flow passed on `2026-04-12`

## Deployment

Use the ticket-local deploy script. It reads server credentials via the repo's existing env loading flow:

- `.env.server.local`
- `.env.local`
- `.env`

Required server env:

- `APPWRITE_API_KEY`
- `APPWRITE_ENDPOINT` or `VITE_APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID` or `VITE_APPWRITE_PROJECT_ID`

Run from repo root:

```bash
./tickets/ticket-01-database-schema/deploy.sh
```

Or directly:

```bash
node tickets/ticket-01-database-schema/deploy.mjs
```

The deploy is idempotent:

- missing collections are created
- missing attributes are created
- missing indexes are created
- missing `shots` fields are created

## Smoke Test

Run the automated smoke test:

```bash
./tickets/ticket-01-database-schema/smoke-test.sh
```

Or directly:

```bash
node tickets/ticket-01-database-schema/smoke-test.mjs
```

The smoke test does all of the following against live Appwrite:

- verifies all 5 collections exist
- verifies required ticket indexes exist
- verifies all new `shots` fields exist
- creates one valid test document per collection
- deletes that test document again
- attempts one invalid create per collection with a missing required field and expects rejection

## Compatibility Notes

- `create-collections-curl.sh` is now only a compatibility shim and delegates to `deploy.sh`
- Older notes in this ticket referenced `databaseId=default`; the live project uses `databaseId=scriptony`

## Next Ticket

After Ticket 1 is green, continue with Ticket 2: `scriptony-style`.
