/**
 * Shared Appwrite function handler wrapper with CORS support.
 *
 * Each function's index.ts exports: `export default createAppwriteHandler(dispatch)`
 * where dispatch is `(req, res) => Promise<void>`.
 */

import {
  corsHeadersForIncomingRequest,
  sendNotFound,
  type RequestLike,
  type ResponseLike,
} from "./http";

type AppwriteContext = {
  req: {
    method?: string;
    path?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
  };
  res: {
    json: (body: unknown, status?: number, headers?: Record<string, string>) => unknown;
    text: (text: string, status?: number, headers?: Record<string, string>) => unknown;
    empty: () => unknown;
  };
};

type Dispatch = (req: RequestLike, res: ResponseLike) => Promise<void>;

export function getPathname(req: RequestLike): string {
  const raw =
    (typeof req?.path === "string" && req.path) ||
    (typeof req?.url === "string" && req.url) ||
    "/";
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return new URL(raw).pathname || "/";
    }
  } catch {
    /* ignore malformed URL-like input */
  }
  const q = raw.indexOf("?");
  return q >= 0 ? raw.slice(0, q) : raw;
}

export function withParams(
  req: RequestLike,
  params: Record<string, string>
): RequestLike {
  return {
    ...req,
    params: {
      ...(req?.params || {}),
      ...params,
    },
  };
}

export function sendRouteNotFound(
  service: string,
  req: RequestLike,
  res: ResponseLike
): void {
  sendNotFound(res, `Route not found for ${service}: ${req?.method || "GET"} ${getPathname(req)}`);
}

export function createAppwriteHandler(dispatch: Dispatch) {
  return async function handler(ctx: AppwriteContext): Promise<unknown> {
    try {
      const req: RequestLike = {
        method: ctx?.req?.method || "GET",
        path: ctx?.req?.path || ctx?.req?.url || "/",
        url: ctx?.req?.url || ctx?.req?.path || "/",
        headers: ctx?.req?.headers || {},
        body: ctx?.req?.body,
        query: ctx?.req?.query || {},
        params: {},
      };

      const cors = corsHeadersForIncomingRequest(req.headers);

      if (req.method === "OPTIONS") {
        return ctx.res.text("", 204, cors);
      }

      let statusCode = 200;
      let payload: unknown = "";
      let isJson = false;
      let finished = false;
      const headers: Record<string, string> = { ...cors };

      const res: ResponseLike = {
        setHeader(name: string, value: string) {
          headers[name] = value;
        },
        status(code: number) {
          statusCode = code;
          return res;
        },
        json(body: unknown) {
          payload = body;
          isJson = true;
          finished = true;
          return res;
        },
        end(body?: string) {
          payload = body || "";
          isJson = false;
          finished = true;
          return res;
        },
      };

      await dispatch(req, res);

      if (!finished) {
        return ctx.res.json(
          { error: "Handler did not produce a response" },
          500,
          cors
        );
      }
      if (isJson) {
        return ctx.res.json(payload, statusCode, headers);
      }
      return ctx.res.text(
        typeof payload === "string" ? payload : String(payload ?? ""),
        statusCode,
        headers
      );
    } catch (err) {
      console.error("[createAppwriteHandler] Uncaught error:", err);
      const cors = corsHeadersForIncomingRequest(ctx?.req?.headers);
      const message = err instanceof Error ? err.message : "Internal error";
      return ctx.res.json({ error: message }, 500, cors);
    }
  };
}
