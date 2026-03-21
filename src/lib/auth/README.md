# Auth (`src/lib/auth`)

## Overview

Scriptony uses the **AuthClient** interface with a single implementation: **AppwriteAuthAdapter** (Appwrite Web SDK). Configuration comes from `VITE_APPWRITE_ENDPOINT` and `VITE_APPWRITE_PROJECT_ID` via `src/lib/env.ts`.

## Files

- **`AuthClient.ts`** — interface (`signInWithPassword`, `signOut`, `getSession`, OAuth, etc.)
- **`AppwriteAuthAdapter.ts`** — Appwrite `Account` integration; JWT for `Authorization: Bearer` on Scriptony functions
- **`getAuthClient.ts`** — singleton factory; throws if Appwrite env is missing
- **`getAuthToken.ts`** — convenience helper for API calls

## Usage

```typescript
import { getAuthToken } from "@/lib/auth/getAuthToken";

const token = await getAuthToken();
// fetch(..., { headers: { Authorization: `Bearer ${token}` } })
```

```typescript
import { getAuthClient } from "@/lib/auth/getAuthClient";

await getAuthClient().signInWithPassword(email, password);
await getAuthClient().signOut();
```

Do **not** import the Appwrite `Account` class directly in feature code; go through **AuthClient** so behavior stays consistent.

## Related

- [docs/SOURCE_OF_TRUTH.md](../../../docs/SOURCE_OF_TRUTH.md)
- [src/lib/appwrite/client.ts](../appwrite/client.ts)
