/**
 * Timeline node stats route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../../../_shared/auth";
import { requestGraphql } from "../../../../../_shared/graphql-compat";
import { toDurationSeconds } from "../../../../../_shared/observability";
import {
  getParam,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../../../_shared/http";
import { getAllProjectNodes, getNodeById, getShotById, getShots } from "../../../../../_shared/timeline";

function collectDescendants(nodes: Array<Record<string, any>>, rootId: string): Array<Record<string, any>> {
  const byParent = new Map<string | null, Array<Record<string, any>>>();
  for (const node of nodes) {
    const key = node.parent_id ?? null;
    byParent.set(key, [...(byParent.get(key) || []), node]);
  }

  const result: Array<Record<string, any>> = [];
  const stack = [...(byParent.get(rootId) || [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    result.push(current);
    stack.push(...(byParent.get(current.id) || []));
  }

  return result;
}

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

    const nodeType = getParam(req, "nodeType");
    const id = getParam(req, "id");
    if (!nodeType || !id) {
      sendBadRequest(res, "nodeType and id are required");
      return;
    }

    if (nodeType === "shot") {
      const shot = await getShotById(id);
      if (!shot) {
        sendNotFound(res, "Shot not found");
        return;
      }

      sendJson(res, 200, {
        characters: Array.isArray(shot.shot_characters) ? shot.shot_characters.length : 0,
        duration: toDurationSeconds(shot),
        has_dialog: Boolean(shot.dialog),
        has_notes: Boolean(shot.notes),
        has_audio: Boolean(shot.sound_notes),
        has_image: Boolean(shot.image_url || shot.storyboard_url),
        camera_angle: shot.camera_angle ?? null,
        framing: shot.framing ?? null,
        lens: shot.lens ?? null,
        camera_movement: shot.camera_movement ?? null,
        created_at: shot.created_at,
        updated_at: shot.updated_at,
      });
      return;
    }

    const node = await getNodeById(id);
    if (!node) {
      sendNotFound(res, "Node not found");
      return;
    }

    const allNodes = await getAllProjectNodes(node.project_id);
    const descendants = collectDescendants(allNodes, id);
    const descendantScenes =
      nodeType === "scene"
        ? [node]
        : descendants.filter((entry) => entry.level === 3);
    const shots = descendantScenes.length
      ? await Promise.all(descendantScenes.map((scene) => getShots({ sceneId: scene.id }))).then((rows) =>
          rows.flat()
        )
      : [];

    const durations = shots.map(toDurationSeconds);
    const totalDuration = durations.reduce((sum, value) => sum + value, 0);

    if (nodeType === "act") {
      sendJson(res, 200, {
        sequences: descendants.filter((entry) => entry.level === 2).length,
        scenes: descendants.filter((entry) => entry.level === 3).length,
        shots: shots.length,
        total_duration: totalDuration,
        created_at: node.created_at,
        updated_at: node.updated_at,
      });
      return;
    }

    if (nodeType === "sequence") {
      sendJson(res, 200, {
        scenes: descendants.filter((entry) => entry.level === 3).length,
        shots: shots.length,
        total_duration: totalDuration,
        average_duration: shots.length ? Math.round(totalDuration / shots.length) : 0,
        created_at: node.created_at,
        updated_at: node.updated_at,
      });
      return;
    }

    if (nodeType === "scene") {
      const characters = await requestGraphql<{
        shot_characters: Array<{ character_id: string }>;
      }>(
        `
          query GetSceneCharacters($shotIds: [uuid!]!) {
            shot_characters(where: { shot_id: { _in: $shotIds } }) {
              character_id
            }
          }
        `,
        { shotIds: shots.map((shot) => shot.id) }
      );

      sendJson(res, 200, {
        shots: shots.length,
        total_duration: totalDuration,
        average_duration: shots.length ? Math.round(totalDuration / shots.length) : 0,
        characters: new Set(characters.shot_characters.map((entry) => entry.character_id)).size,
        created_at: node.created_at,
        updated_at: node.updated_at,
      });
      return;
    }

    sendBadRequest(res, `Unsupported nodeType: ${nodeType}`);
  } catch (error) {
    sendServerError(res, error);
  }
}
