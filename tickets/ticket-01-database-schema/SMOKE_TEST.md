# Ticket 1 Smoke Test

## Latest Automated Run

- Date: `2026-04-12`
- Target database: `scriptony`
- Result: `PASS`

## Verified

[x] 1. All 5 collections exist in Appwrite
    - `styleProfiles`
    - `renderJobs`
    - `imageTasks`
    - `guideBundles`
    - `stageDocuments`

[x] 2. All collection attributes from the ticket JSON specs exist

[x] 3. All required ticket indexes exist

[x] 4. `shots` contains the new fields
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

[x] 5. One valid test document was created and deleted in each collection
    - `styleProfiles`
    - `renderJobs`
    - `imageTasks`
    - `guideBundles`
    - `stageDocuments`

[x] 6. Required fields are enforced
    - For each collection, one invalid create with a missing required field was rejected as expected

## Command

Run the same smoke test again with:

```bash
./tickets/ticket-01-database-schema/smoke-test.sh
```

or

```bash
node tickets/ticket-01-database-schema/smoke-test.mjs
```

## Notes

- The smoke test uses real Appwrite create/delete document operations.
- Test documents are removed again after successful creation.
- This test verifies schema availability and basic write enforcement, not application-level business logic.
