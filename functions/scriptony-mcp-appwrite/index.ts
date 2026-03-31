/**
 * Thin Appwrite host: auth → runtime context → scriptony-runtime orchestrator.
 * Capability definitions live in src/scriptony-mcp; orchestration in src/scriptony-runtime.
 */

import "../_shared/fetch-polyfill";
import { createAppwriteHandler } from "../_shared/appwrite-handler";
import { requireUserBootstrap } from "../_shared/auth";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../_shared/http";
import { createDefaultCapabilityRegistry } from "../../src/scriptony-mcp/tools/project-capabilities";
import { createProviderRouterFromSummary } from "../../src/scriptony-runtime/provider-router";
import { runMcpOrchestrator, type OrchestratorRequest } from "../../src/scriptony-runtime/orchestrator";
import { createScriptonyInfra } from "./create-infra";
import { loadAssistantProfileSummary } from "./provider-context";

const registry = createDefaultCapabilityRegistry();

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

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const pathname = getPathname(req);

    if (pathname === "/" || pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        service: "scriptony-mcp-appwrite",
        provider: "appwrite",
        note: "assistant_profile is included on authenticated POST /invoke responses only.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (pathname !== "/invoke" && pathname !== "/invoke/") {
      sendBadRequest(res, `Unknown route: ${pathname}`);
      return;
    }

    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const body = await readJsonBody<Record<string, unknown>>(req);
    const actionRaw = typeof body.action === "string" ? body.action.trim() : "";
    if (actionRaw !== "list_tools" && actionRaw !== "invoke") {
      sendBadRequest(res, 'Body "action" must be "list_tools" or "invoke"');
      return;
    }

    const tool = typeof body.tool === "string" ? body.tool.trim() : undefined;
    const input = body.input;
    const approved = body.approved === true;
    const projectId = typeof body.project_id === "string" ? body.project_id.trim() : undefined;

    if (actionRaw === "invoke" && !tool) {
      sendBadRequest(res, 'invoke requires string "tool"');
      return;
    }

    const orchReq: OrchestratorRequest = {
      action: actionRaw,
      tool,
      input,
      approved,
    };

    const profile = await loadAssistantProfileSummary(bootstrap.user.id);
    const router = createProviderRouterFromSummary(profile);

    const infra = createScriptonyInfra(bootstrap);
    const out = await runMcpOrchestrator(
      registry,
      router,
      {
        user: {
          id: bootstrap.user.id,
          email: bootstrap.user.email,
          displayName: bootstrap.user.displayName,
        },
        organizationId: bootstrap.organizationId,
        projectId,
        infra,
        requestPath: pathname,
      },
      orchReq
    );

    sendJson(res, 200, out);
  } catch (error) {
    sendServerError(res, error);
  }
}

export default createAppwriteHandler(dispatch);
