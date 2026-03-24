/**
 * Appwrite function entrypoint for the projects service.
 *
 * Routes incoming HTTP paths to existing handlers in this folder.
 * Location: functions/scriptony-projects/index.ts
 */

import healthHandler from "./health";
import projectsHandler from "./projects/index";
import projectByIdHandler from "./projects/[id]";
import projectUploadImageHandler from "./projects/[id]/upload-image";
import { sendNotFound, CORS_HEADERS, type RequestLike, type ResponseLike } from "../_shared/http";

function getPathname(req: RequestLike): string {
  const direct =
    (typeof req?.path === "string" && req.path) ||
    (typeof req?.url === "string" && req.url) ||
    "/";

  try {
    if (direct.startsWith("http://") || direct.startsWith("https://")) {
      return new URL(direct).pathname || "/";
    }
  } catch {
    // keep fallback below
  }

  const q = direct.indexOf("?");
  return q >= 0 ? direct.slice(0, q) : direct;
}

function withParams(req: RequestLike, params: Record<string, string>): RequestLike {
  req.params = { ...(req.params || {}), ...params };
  return req;
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  if (pathname === "/" || pathname === "/health") {
    await healthHandler(req, res);
    return;
  }

  if (pathname === "/projects") {
    await projectsHandler(req, res);
    return;
  }

  const uploadMatch = pathname.match(/^\/projects\/([^/]+)\/upload-image$/);
  if (uploadMatch) {
    await projectUploadImageHandler(withParams(req, { id: uploadMatch[1] }), res);
    return;
  }

  const byIdMatch = pathname.match(/^\/projects\/([^/]+)$/);
  if (byIdMatch) {
    await projectByIdHandler(withParams(req, { id: byIdMatch[1] }), res);
    return;
  }

  sendNotFound(res, `Route not found in scriptony-projects: ${pathname}`);
}

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

export default async function handler(ctx: AppwriteContext): Promise<unknown> {
  const req: RequestLike = {
    method: ctx?.req?.method || "GET",
    path: ctx?.req?.path || ctx?.req?.url || "/",
    url: ctx?.req?.url || ctx?.req?.path || "/",
    headers: ctx?.req?.headers || {},
    body: ctx?.req?.body,
    query: ctx?.req?.query || {},
    params: {},
  };

  // Handle CORS preflight
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
}
