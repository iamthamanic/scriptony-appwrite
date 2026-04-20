/**
 * Ultra batch timeline load route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import {
  getQuery,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import { Query } from "node-appwrite";
import {
  getAllProjectNodes,
  getCharactersByProject,
  getShots,
  mapCharacter,
  mapNode,
  mapShot,
} from "../../_shared/timeline";
import { C, listDocumentsFull } from "../../_shared/appwrite-db";
import { mapClip } from "../../_shared/clips-map";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const projectId = getQuery(req, "project_id") || getQuery(req, "projectId");
    if (!projectId) {
      sendBadRequest(res, "project_id is required");
      return;
    }

    const includeShots = (getQuery(req, "include_shots") || "true") !== "false";
    const excludeContent =
      (getQuery(req, "exclude_content") || "false") === "true";

    const [nodes, characters, shots, clipRows] = await Promise.all([
      getAllProjectNodes(projectId),
      getCharactersByProject(projectId),
      includeShots ? getShots({ projectId }) : Promise.resolve([]),
      listDocumentsFull(C.clips, [Query.equal("project_id", projectId)]),
    ]);

    const mappedNodes = nodes.map(mapNode).map((node) => {
      if (!excludeContent || !node || typeof node !== "object") return node;
      const n = node as Record<string, unknown>;
      const metadata = n.metadata && typeof n.metadata === "object"
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
    const acts = mappedNodes.filter((node) => node.level === 1);
    const sequences = mappedNodes.filter((node) => node.level === 2);
    const scenes = mappedNodes.filter((node) => node.level === 3);
    const mappedCharacters = characters.map(mapCharacter);
    const mappedShots = shots.map(mapShot);
    const mappedClips = clipRows.map(mapClip);

    sendJson(res, 200, {
      timeline: {
        acts,
        sequences,
        scenes,
      },
      characters: mappedCharacters,
      shots: mappedShots,
      clips: mappedClips,
      stats: {
        totalNodes: mappedNodes.length,
        acts: acts.length,
        sequences: sequences.length,
        scenes: scenes.length,
        characters: mappedCharacters.length,
        shots: mappedShots.length,
        clips: mappedClips.length,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
