/**
 * Appwrite function entry: scriptony-assistant (T11 bereinigt).
 *
 * Verbleibende Verantwortung:
 *   - Chat Experience (/ai/chat)
 *   - Conversations, Messages, Prompts (/ai/conversations/*)
 *   - RAG Sync (/ai/rag/sync)
 *   - Token Counting (/ai/count-tokens)
 *   - assistant-spezifische Utilities
 *
 * T11 MIGRIERT:
 *   - AI Settings/Models/Validate-Key → scriptony-ai
 *   - Gym Starter → scriptony-gym
 *   - MCP Tool Registry → scriptony-mcp-appwrite
 */

import "../_shared/fetch-polyfill";
import chatHandler from "./ai/chat";
import ragSyncHandler from "./ai/rag/sync";
import countTokensHandler from "./ai/count-tokens";
import conversationsCollectionHandler from "./ai/conversations/index";
import conversationMessagesHandler from "./ai/conversations/[id]/messages";
import conversationPromptHandler from "./ai/conversations/[id]/prompt";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendNotFound,
} from "../_shared/http";
import { createAppwriteHandler } from "../_shared/appwrite-handler";

function getPathname(req: RequestLike): string {
  const direct = (typeof req?.path === "string" && req.path) ||
    (typeof req?.url === "string" && req.url) ||
    "/";
  let p: string;
  try {
    if (direct.startsWith("http://") || direct.startsWith("https://")) {
      p = new URL(direct).pathname || "/";
    } else {
      const q = direct.indexOf("?");
      p = q >= 0 ? direct.slice(0, q) : direct;
    }
  } catch {
    const q = direct.indexOf("?");
    p = q >= 0 ? direct.slice(0, q) : direct;
  }
  // Dual-prefix: accept both /ai/assistant/* (canonical) and /ai/* (legacy).
  // Normalise /ai/assistant/* → /ai/* so every downstream match keeps working.
  if (p.startsWith("/ai/assistant")) {
    p = "/ai" + p.slice("/ai/assistant".length);
    // edge case: /ai/assistant with no trailing path → /ai
    if (p === "/ai") p = "/ai/";
  }
  return p;
}

function withParams(
  req: RequestLike,
  params: Record<string, string>,
): RequestLike {
  req.params = { ...(req.params || {}), ...params };
  return req;
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-assistant",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (pathname === "/ai/rag/sync") {
    await ragSyncHandler(req, res);
    return;
  }

  if (pathname === "/ai/gym/generate-starter") {
    sendJson(res, 410, {
      error: "Gone",
      message:
        "T11: Gym Starter wurde zu scriptony-gym verschoben. " +
        "Nutze POST /generate-starter bei scriptony-gym.",
    });
    return;
  }

  const convMessages = pathname.match(
    /^\/ai\/conversations\/([^/]+)\/messages$/,
  );
  if (convMessages) {
    await conversationMessagesHandler(
      withParams(req, { id: convMessages[1] }),
      res,
    );
    return;
  }

  const convPrompt = pathname.match(/^\/ai\/conversations\/([^/]+)\/prompt$/);
  if (convPrompt) {
    await conversationPromptHandler(
      withParams(req, { id: convPrompt[1] }),
      res,
    );
    return;
  }

  if (pathname === "/ai/conversations") {
    await conversationsCollectionHandler(req, res);
    return;
  }

  if (pathname === "/ai/settings") {
    sendJson(res, 410, {
      error: "Gone",
      message:
        "T11: AI Settings wurden zu scriptony-ai verschoben. " +
        "Nutze GET/PUT /settings oder /features/assistant_chat bei scriptony-ai.",
    });
    return;
  }

  if (pathname === "/ai/models") {
    sendJson(res, 410, {
      error: "Gone",
      message:
        "T11: AI Models wurden zu scriptony-ai verschoben. " +
        "Nutze GET /providers/:provider/models bei scriptony-ai.",
    });
    return;
  }

  if (pathname === "/ai/chat") {
    await chatHandler(req, res);
    return;
  }

  if (pathname === "/ai/validate-key") {
    sendJson(res, 410, {
      error: "Gone",
      message:
        "T11: AI Key Validation wurde zu scriptony-ai verschoben. " +
        "Nutze POST /providers/:provider/validate bei scriptony-ai.",
    });
    return;
  }

  if (pathname === "/ai/count-tokens") {
    await countTokensHandler(req, res);
    return;
  }

  if (pathname === "/mcp/tools" || pathname === "/mcp/tools/") {
    sendJson(res, 410, {
      error: "Gone",
      message:
        "T11: MCP Tool Registry wurde zu scriptony-mcp-appwrite verschoben. " +
        "Nutze GET /tools bei scriptony-mcp-appwrite.",
    });
    return;
  }

  sendNotFound(res, `Route not found in scriptony-assistant: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
