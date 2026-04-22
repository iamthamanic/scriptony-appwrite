/**
 * Minimal adapter for running Hono apps inside the existing Appwrite function runtime.
 */

import { Headers, Request as UndiciRequest } from "undici";
import { corsHeadersForIncomingRequest } from "./http";

type AppwriteContext = {
  req: {
    method?: string;
    path?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  res: {
    json: (
      body: unknown,
      status?: number,
      headers?: Record<string, string>,
    ) => unknown;
    text: (
      text: string,
      status?: number,
      headers?: Record<string, string>,
    ) => unknown;
  };
};

function requestUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return `http://local${
    pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`
  }`;
}

export function createHonoAppwriteHandler(app: {
  fetch: (request: Request) => Promise<Response> | Response;
}) {
  return async function honoHandler(ctx: AppwriteContext): Promise<unknown> {
    return dispatchHonoApp(
      app,
      {
        method: ctx.req.method || "GET",
        path: ctx.req.path || ctx.req.url || "/",
        url: ctx.req.url || ctx.req.path || "/",
        headers: ctx.req.headers || {},
        body: ctx.req.body,
      },
      {
        json: (body, status, headers) => ctx.res.json(body, status, headers),
        text: (text, status, headers) => ctx.res.text(text, status, headers),
      },
    );
  };
}

export async function dispatchHonoApp(
  app: { fetch: (request: Request) => Promise<Response> | Response },
  req: {
    method?: string;
    path?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
  },
  res: {
    json: (
      body: unknown,
      status?: number,
      headers?: Record<string, string>,
    ) => unknown;
    text: (
      text: string,
      status?: number,
      headers?: Record<string, string>,
    ) => unknown;
  },
): Promise<unknown> {
  const method = req.method || "GET";
  const pathOrUrl = req.path || req.url || "/";
  const headers = new Headers(req.headers || {});
  const cors = corsHeadersForIncomingRequest(req.headers);

  let body: any;
  if (
    method !== "GET" &&
    method !== "HEAD" &&
    req.body !== undefined &&
    req.body !== null
  ) {
    if (
      typeof req.body === "string" ||
      req.body instanceof Uint8Array ||
      req.body instanceof ArrayBuffer
    ) {
      body = req.body as any;
    } else {
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
      body = JSON.stringify(req.body);
    }
  }

  const request = new UndiciRequest(requestUrl(pathOrUrl), {
    method,
    headers,
    body,
  });

  const response = await app.fetch(request as unknown as Request);
  const responseHeaders = Object.fromEntries(
    Array.from(response.headers as unknown as Iterable<[string, string]>),
  );
  const mergedHeaders = { ...cors, ...responseHeaders };
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const json = await response.json().catch(() => ({}));
    return res.json(json, response.status, mergedHeaders);
  }

  const text = await response.text();
  return res.text(text, response.status, mergedHeaders);
}
