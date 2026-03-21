/**
 * Ultra batch timeline load route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import {
  getQuery,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";
import {
  getAllProjectNodes,
  getCharactersByProject,
  getShots,
  mapCharacter,
  mapNode,
  mapShot,
} from "../../../_shared/timeline";

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
    if (!projectId) {
      sendBadRequest(res, "project_id is required");
      return;
    }

    const [nodes, characters, shots] = await Promise.all([
      getAllProjectNodes(projectId),
      getCharactersByProject(projectId),
      getShots({ projectId }),
    ]);

    const mappedNodes = nodes.map(mapNode);
    const acts = mappedNodes.filter((node) => node.level === 1);
    const sequences = mappedNodes.filter((node) => node.level === 2);
    const scenes = mappedNodes.filter((node) => node.level === 3);
    const mappedCharacters = characters.map(mapCharacter);
    const mappedShots = shots.map(mapShot);

    sendJson(res, 200, {
      timeline: {
        acts,
        sequences,
        scenes,
      },
      characters: mappedCharacters,
      shots: mappedShots,
      stats: {
        totalNodes: mappedNodes.length,
        acts: acts.length,
        sequences: sequences.length,
        scenes: scenes.length,
        characters: mappedCharacters.length,
        shots: mappedShots.length,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
