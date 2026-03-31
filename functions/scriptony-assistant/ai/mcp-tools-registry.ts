/**
 * MCP-compatible tool registry (HTTP stub). Full tool execution routes through existing APIs.
 * Location: functions/scriptony-assistant/ai/mcp-tools-registry.ts
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { sendJson, sendMethodNotAllowed, sendUnauthorized, type RequestLike, type ResponseLike } from "../../_shared/http";

const TOOL_DESCRIPTORS = [
  {
    name: "list_projects",
    description: "List projects for the authenticated user (HTTP: GET /projects)",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_shots_by_scene",
    description: "List shots for a scene (HTTP: GET /shots/by-scene/:sceneId)",
    input_schema: {
      type: "object",
      properties: { scene_id: { type: "string" } },
      required: ["scene_id"],
    },
  },
  {
    name: "ai_chat",
    description: "Send a message to Scriptony Assistant (HTTP: POST /ai/chat)",
    input_schema: {
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
    },
  },
] as const;

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  const bootstrap = await requireUserBootstrap(req.headers.authorization);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  if (req.method === "GET") {
    sendJson(res, 200, {
      version: "0.1",
      tools: TOOL_DESCRIPTORS,
      note: "Invoke the same operations via Appwrite HTTP routes; MCP server can mirror this registry.",
    });
    return;
  }

  sendMethodNotAllowed(res, ["GET"]);
}
