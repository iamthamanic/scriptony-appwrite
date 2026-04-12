/**
 * @deprecated — No longer called from scriptony-ai/index.ts.
 *
 * The gateway now routes legacy assistant paths (/ai/chat, /ai/settings, /ai/models, …)
 * directly to scriptony-assistant, which also supports the canonical /ai/assistant/* namespace.
 * This file is kept for reference and for the Hono `mountAssistantLegacyRoutes` helper
 * (still used by tests or other consumers). Safe to delete once no imports remain.
 *
 * Legacy Assistant HTTP handlers (GraphQL-backed chat, RAG, settings) mounted at `/ai/*`.
 * Logic lives in `scriptony-assistant/ai/*`; this module adapts Express-like req/res to Hono.
 *
 * Location: functions/scriptony-ai/assistant-legacy.ts
 */

import type { Context, Hono } from "hono";
import type { RequestLike, ResponseLike } from "../_shared/http";

import settingsHandler from "../scriptony-assistant/ai/settings";
import modelsHandler from "../scriptony-assistant/ai/models";
import validateKeyHandler from "../scriptony-assistant/ai/validate-key";
import countTokensHandler from "../scriptony-assistant/ai/count-tokens";
import ragSyncHandler from "../scriptony-assistant/ai/rag/sync";
import conversationsIndexHandler from "../scriptony-assistant/ai/conversations/index";
import conversationMessagesHandler from "../scriptony-assistant/ai/conversations/[id]/messages";
import conversationPromptHandler from "../scriptony-assistant/ai/conversations/[id]/prompt";
import chatHandler from "../scriptony-assistant/ai/chat";

type LegacyHandler = (req: RequestLike, res: ResponseLike) => Promise<void>;

type LegacyRouteMatch = {
  handler: LegacyHandler;
  params?: Record<string, string>;
};

async function ensureFetchPolyfillLoaded(): Promise<void> {
  await import("../_shared/fetch-polyfill");
}

function getPathname(req: RequestLike): string {
  const raw = (typeof req?.path === "string" && req.path) || (typeof req?.url === "string" && req.url) || "/";
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return new URL(raw).pathname || "/";
    }
  } catch {
    /* ignore */
  }
  const q = raw.indexOf("?");
  return q >= 0 ? raw.slice(0, q) : raw;
}

function matchAssistantLegacyRoute(pathname: string): LegacyRouteMatch | null {
  if (/^\/ai\/settings\/?$/.test(pathname)) return { handler: settingsHandler };
  if (/^\/ai\/models\/?$/.test(pathname)) return { handler: modelsHandler };
  if (/^\/ai\/validate-key\/?$/.test(pathname)) return { handler: validateKeyHandler };
  if (/^\/ai\/count-tokens\/?$/.test(pathname)) return { handler: countTokensHandler };
  if (/^\/ai\/rag\/sync\/?$/.test(pathname)) return { handler: ragSyncHandler };
  if (/^\/ai\/conversations\/?$/.test(pathname)) return { handler: conversationsIndexHandler };

  const messagesMatch = pathname.match(/^\/ai\/conversations\/([^/]+)\/messages\/?$/);
  if (messagesMatch) {
    return {
      handler: conversationMessagesHandler,
      params: { id: messagesMatch[1] },
    };
  }

  const promptMatch = pathname.match(/^\/ai\/conversations\/([^/]+)\/prompt\/?$/);
  if (promptMatch) {
    return {
      handler: conversationPromptHandler,
      params: { id: promptMatch[1] },
    };
  }

  if (/^\/ai\/chat\/?$/.test(pathname)) return { handler: chatHandler };
  return null;
}

function routeNeedsFetchPolyfill(pathname: string): boolean {
  return (
    /^\/ai\/models\/?$/.test(pathname) ||
    /^\/ai\/validate-key\/?$/.test(pathname) ||
    /^\/ai\/chat\/?$/.test(pathname)
  );
}

export async function dispatchAssistantLegacyRoute(
  req: RequestLike,
  res: ResponseLike
): Promise<boolean> {
  const pathname = getPathname(req);
  const match = matchAssistantLegacyRoute(pathname);
  if (!match) return false;

  if (routeNeedsFetchPolyfill(pathname)) {
    await ensureFetchPolyfillLoaded();
  }

  await match.handler(
    {
      ...req,
      params: {
        ...(req?.params || {}),
        ...(match.params || {}),
      },
    },
    res
  );
  return true;
}

async function runLegacyHandler(
  c: Context,
  handler: (req: RequestLike, res: ResponseLike) => Promise<void>,
  params: Record<string, string> = {}
): Promise<Response> {
  const method = c.req.method;
  if (method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  let parsedBody: unknown = undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      parsedBody = await c.req.json();
    } catch {
      parsedBody = {};
    }
  }

  const requestHeaders: Record<string, string> = {};
  const auth =
    c.req.header("authorization") ?? c.req.header("Authorization");
  const appwriteJwt =
    c.req.header("x-appwrite-user-jwt") ?? c.req.header("X-Appwrite-User-Jwt");
  const executionId =
    c.req.header("x-appwrite-execution-id") ?? c.req.header("X-Appwrite-Execution-Id");
  const userId =
    c.req.header("x-appwrite-user-id") ?? c.req.header("X-Appwrite-User-Id");

  if (auth?.trim()) {
    requestHeaders.authorization = auth.trim();
  }
  if (appwriteJwt?.trim()) {
    requestHeaders["x-appwrite-user-jwt"] = appwriteJwt.trim();
    if (!requestHeaders.authorization) {
      requestHeaders.authorization = `Bearer ${appwriteJwt.trim()}`;
    }
  }
  if (executionId?.trim()) {
    requestHeaders["x-appwrite-execution-id"] = executionId.trim();
  }
  if (userId?.trim()) {
    requestHeaders["x-appwrite-user-id"] = userId.trim();
  }

  const req: RequestLike = {
    method,
    headers: requestHeaders,
    body: parsedBody,
    params,
  };

  let status = 200;
  let jsonBody: unknown = {};
  const outHeaders: Record<string, string> = {};

  const res: ResponseLike = {
    status(code: number) {
      status = code;
      return res;
    },
    json(data: unknown) {
      jsonBody = data;
      return res;
    },
    setHeader(name: string, value: string) {
      outHeaders[name] = value;
    },
    end() {},
  };

  await handler(req, res);

  const headers = new Headers(outHeaders);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return new Response(JSON.stringify(jsonBody), { status, headers });
}

/**
 * Registers `/ai/*` routes (mounted with `app.route("/ai", …)` so paths here omit `/ai`).
 */
export function mountAssistantLegacyRoutes(ai: Hono): void {
  ai.all("/settings", (c) => runLegacyHandler(c, settingsHandler));
  ai.all("/models", (c) => runLegacyHandler(c, modelsHandler));
  ai.all("/validate-key", (c) => runLegacyHandler(c, validateKeyHandler));
  ai.all("/count-tokens", (c) => runLegacyHandler(c, countTokensHandler));
  ai.all("/rag/sync", (c) => runLegacyHandler(c, ragSyncHandler));
  ai.all("/conversations", (c) => runLegacyHandler(c, conversationsIndexHandler));
  ai.all("/conversations/:id/messages", (c) =>
    runLegacyHandler(c, conversationMessagesHandler, { id: c.req.param("id") })
  );
  ai.all("/conversations/:id/prompt", (c) =>
    runLegacyHandler(c, conversationPromptHandler, { id: c.req.param("id") })
  );
  ai.all("/chat", (c) => runLegacyHandler(c, chatHandler));
}
