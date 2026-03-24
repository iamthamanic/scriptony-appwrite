/**
 * Shared Appwrite function handler wrapper with CORS support.
 *
 * Each function's index.ts exports: `export default createAppwriteHandler(dispatch)`
 * where dispatch is `(req, res) => Promise<void>`.
 */

import { CORS_HEADERS, type RequestLike, type ResponseLike } from "./http";

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

export function createAppwriteHandler(dispatch: Dispatch) {
  return async function handler(ctx: AppwriteContext): Promise<unknown> {
    const req: RequestLike = {
      method: ctx?.req?.method || "GET",
      path: ctx?.req?.path || ctx?.req?.url || "/",
      url: ctx?.req?.url || ctx?.req?.path || "/",
      headers: ctx?.req?.headers || {},
      body: ctx?.req?.body,
      query: ctx?.req?.query || {},
      params: {},
    };

    if (req.method === "OPTIONS") {
      return ctx.res.text("", 204, CORS_HEADERS);
    }

    let statusCode = 200;
    let payload: unknown = "";
    let isJson = false;
    let finished = false;
    const headers: Record<string, string> = { ...CORS_HEADERS };

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
      return ctx.res.empty();
    }
    if (isJson) {
      return ctx.res.json(payload, statusCode, headers);
    }
    return ctx.res.text(typeof payload === "string" ? payload : String(payload ?? ""), statusCode, headers);
  };
}
