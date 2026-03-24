/**
 * Shared HTTP helpers for Scriptony functions.
 *
 * Handlers use Express-like request and response objects.
 */

export type RequestLike = any;
export type ResponseLike = any;

function getHeaderCaseInsensitive(
  headers: Record<string, string> | undefined,
  name: string
): string {
  if (!headers) return "";
  const want = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === want) {
      return typeof v === "string" ? v.trim() : "";
    }
  }
  return "";
}

const CORS_COMMON: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With, Accept, X-Appwrite-Project, X-Appwrite-Key, X-SDK-Version",
  "Access-Control-Max-Age": "86400",
};

/**
 * CORS for browser calls. Echoes `Origin` when it is localhost/127.0.0.1 or listed in
 * `SCRIPTONY_CORS_ALLOWED_ORIGINS` (comma-separated, set in Appwrite → function variables).
 * Otherwise `Access-Control-Allow-Origin: *` (works with Bearer tokens, not cookies).
 */
export function corsHeadersForIncomingRequest(
  incoming?: Record<string, string>
): Record<string, string> {
  const origin = getHeaderCaseInsensitive(incoming, "origin");
  const extra =
    process.env.SCRIPTONY_CORS_ALLOWED_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const localOk =
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
  const listedOk = Boolean(origin && extra.includes(origin));
  const allowOrigin = (localOk || listedOk) && origin ? origin : "*";

  return {
    ...CORS_COMMON,
    "Access-Control-Allow-Origin": allowOrigin,
  };
}

/** Standard CORS headers for browser access (wildcard origin). */
export const CORS_HEADERS: Record<string, string> = {
  ...CORS_COMMON,
  "Access-Control-Allow-Origin": "*",
};

export function sendJson(res: ResponseLike, status: number, body: unknown): void {
  res.status(status).json(body);
}

export function sendMethodNotAllowed(res: ResponseLike, allowed: string[]): void {
  res.setHeader("Allow", allowed.join(", "));
  sendJson(res, 405, { error: "Method not allowed", allowed });
}

export function sendUnauthorized(res: ResponseLike): void {
  sendJson(res, 401, { error: "Unauthorized" });
}

export function sendForbidden(res: ResponseLike, message = "Forbidden"): void {
  sendJson(res, 403, { error: message });
}

export function sendNotFound(res: ResponseLike, message = "Not found"): void {
  sendJson(res, 404, { error: message });
}

export function sendBadRequest(res: ResponseLike, message: string): void {
  sendJson(res, 400, { error: message });
}

export function sendServerError(res: ResponseLike, error: unknown): void {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("[Functions] Unexpected error:", error);
  sendJson(res, 500, { error: message });
}

export function sendNotImplemented(res: ResponseLike, message: string): void {
  sendJson(res, 501, { error: message });
}

export async function readJsonBody<T = Record<string, any>>(req: RequestLike): Promise<T> {
  if (req.body && typeof req.body === "object") {
    return req.body as T;
  }

  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body) as T;
  }

  return {} as T;
}

export function getParam(req: RequestLike, name: string): string {
  return req.params?.[name];
}

export function getQuery(req: RequestLike, name: string): string | undefined {
  const value = req.query?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function sendRedirect(res: ResponseLike, status: 302 | 303, url: string): void {
  res.setHeader("Location", url);
  res.status(status).end();
}
