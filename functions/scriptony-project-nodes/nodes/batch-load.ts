/**
 * Batch timeline load route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import {
  getQuery,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import { getAllProjectNodes, mapNode } from "../../_shared/timeline";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const projectId = getQuery(req, "project_id") || getQuery(req, "projectId");
    const excludeContent = (getQuery(req, "exclude_content") || "false") === "true";
    if (!projectId) {
      sendBadRequest(res, "project_id is required");
      return;
    }

    const nodes = (await getAllProjectNodes(projectId)).map(mapNode).map((node) => {
      if (!excludeContent || !node || typeof node !== "object") return node;
      const n = node as Record<string, unknown>;
      const metadata =
        n.metadata && typeof n.metadata === "object"
          ? { ...(n.metadata as Record<string, unknown>) }
          : undefined;
      if (metadata && "content" in metadata) {
        delete metadata.content;
      }
      return {
        ...n,
        metadata,
        content: undefined,
      };
    });
    const acts = nodes.filter((node) => node.level === 1);
    const sequences = nodes.filter((node) => node.level === 2);
    const scenes = nodes.filter((node) => node.level === 3);

    sendJson(res, 200, {
      acts,
      sequences,
      scenes,
      stats: {
        totalNodes: nodes.length,
        acts: acts.length,
        sequences: sequences.length,
        scenes: scenes.length,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
