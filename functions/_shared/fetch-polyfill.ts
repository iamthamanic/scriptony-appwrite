/**
 * Appwrite function runtimes may use Node without global `fetch` (e.g. 16.x).
 * `_shared/ai.ts` and other modules call `fetch()` — polyfill once at bundle entry.
 * Use undici v5.x: v6 requires Node >=18.17 while Appwrite `node-16.0` runtimes still load this bundle.
 * Location: functions/_shared/fetch-polyfill.ts
 */

import { ReadableStream, WritableStream, TransformStream } from "node:stream/web";

type StreamGlobals = {
  ReadableStream?: typeof ReadableStream;
  WritableStream?: typeof WritableStream;
  TransformStream?: typeof TransformStream;
  fetch?: typeof import("undici").fetch;
  Headers?: typeof import("undici").Headers;
  Request?: typeof import("undici").Request;
  Response?: typeof import("undici").Response;
  FormData?: typeof import("undici").FormData;
  File?: typeof import("undici").File;
};

const runtimeGlobals = globalThis as unknown as StreamGlobals;

if (typeof runtimeGlobals.ReadableStream === "undefined") {
  runtimeGlobals.ReadableStream = ReadableStream;
}

if (typeof runtimeGlobals.WritableStream === "undefined") {
  runtimeGlobals.WritableStream = WritableStream;
}

if (typeof runtimeGlobals.TransformStream === "undefined") {
  runtimeGlobals.TransformStream = TransformStream;
}

if (typeof runtimeGlobals.fetch !== "function") {
  const undici = require("undici") as typeof import("undici");
  runtimeGlobals.fetch = undici.fetch;
  runtimeGlobals.Headers = runtimeGlobals.Headers || undici.Headers;
  runtimeGlobals.Request = runtimeGlobals.Request || undici.Request;
  runtimeGlobals.Response = runtimeGlobals.Response || undici.Response;
  runtimeGlobals.FormData = runtimeGlobals.FormData || undici.FormData;
  runtimeGlobals.File = runtimeGlobals.File || undici.File;
}
