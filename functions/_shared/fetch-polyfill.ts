/**
 * Appwrite function runtimes may use Node without global `fetch` (e.g. 16.x).
 * `_shared/ai.ts` and other modules call `fetch()` — polyfill once at bundle entry.
 * Use undici v5.x: v6 requires Node >=18.17 while Appwrite `node-16.0` runtimes still load this bundle.
 * Location: functions/_shared/fetch-polyfill.ts
 */

import { fetch as undiciFetch } from "undici";

if (typeof globalThis.fetch !== "function") {
  (globalThis as unknown as { fetch: typeof undiciFetch }).fetch = undiciFetch;
}
