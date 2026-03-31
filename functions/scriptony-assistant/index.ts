/**
 * Appwrite function entry: scriptony-assistant (AI settings, chat, conversations, gym starter, MCP stub).
 */

import "../_shared/fetch-polyfill";
import chatHandler from "./ai/chat";
import settingsHandler from "./ai/settings";
import modelsHandler from "./ai/models";
import validateKeyHandler from "./ai/validate-key";
import countTokensHandler from "./ai/count-tokens";
import gymGenerateStarterHandler from "./ai/gym-generate-starter";
import ragSyncHandler from "./ai/rag/sync";
import conversationsCollectionHandler from "./ai/conversations/index";
import conversationMessagesHandler from "./ai/conversations/[id]/messages";
import conversationPromptHandler from "./ai/conversations/[id]/prompt";
import mcpToolsRegistryHandler from "./ai/mcp-tools-registry";
import { sendJson, sendNotFound, type RequestLike, type ResponseLike } from "../_shared/http";
import { createAppwriteHandler } from "../_shared/appwrite-handler";

function getPathname(req: RequestLike): string {
  const direct = (typeof req?.path === "string" && req.path) || (typeof req?.url === "string" && req.url) || "/";
  try {
    if (direct.startsWith("http://") || direct.startsWith("https://")) return new URL(direct).pathname || "/";
  } catch {
    /* fallback */
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
    await gymGenerateStarterHandler(req, res);
    return;
  }

  const convMessages = pathname.match(/^\/ai\/conversations\/([^/]+)\/messages$/);
  if (convMessages) {
    await conversationMessagesHandler(withParams(req, { id: convMessages[1] }), res);
    return;
  }

  const convPrompt = pathname.match(/^\/ai\/conversations\/([^/]+)\/prompt$/);
  if (convPrompt) {
    await conversationPromptHandler(withParams(req, { id: convPrompt[1] }), res);
    return;
  }

  if (pathname === "/ai/conversations") {
    await conversationsCollectionHandler(req, res);
    return;
  }

  if (pathname === "/ai/settings") {
    await settingsHandler(req, res);
    return;
  }

  if (pathname === "/ai/models") {
    await modelsHandler(req, res);
    return;
  }

  if (pathname === "/ai/chat") {
    await chatHandler(req, res);
    return;
  }

  if (pathname === "/ai/validate-key") {
    await validateKeyHandler(req, res);
    return;
  }

  if (pathname === "/ai/count-tokens") {
    await countTokensHandler(req, res);
    return;
  }

  if (pathname === "/mcp/tools" || pathname === "/mcp/tools/") {
    await mcpToolsRegistryHandler(req, res);
    return;
  }

  sendNotFound(res, `Route not found in scriptony-assistant: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
