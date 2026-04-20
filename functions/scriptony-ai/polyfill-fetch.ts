/**
 * Appwrite Functions (Node 16) may not expose global fetch / Request — required by
 * undici, Hono, and `_shared/ai-service/model-discovery`.
 * Web Streams are injected first via `inject-node16-streams.cjs` in the esbuild command.
 */

import {
  fetch as undiciFetch,
  Headers as UndiciHeaders,
  Request as UndiciRequest,
  Response as UndiciResponse,
} from "undici";

const g = globalThis as typeof globalThis & {
  fetch?: typeof fetch;
  Request?: typeof Request;
  Response?: typeof Response;
  Headers?: typeof Headers;
};

if (!g.fetch) {
  g.fetch = undiciFetch as typeof fetch;
  g.Request = UndiciRequest as typeof Request;
  g.Response = UndiciResponse as typeof Response;
  g.Headers = UndiciHeaders as typeof Headers;
}
