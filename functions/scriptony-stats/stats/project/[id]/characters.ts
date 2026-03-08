/**
 * Project character analytics route for the Nhost compatibility layer.
 */

import { requireUserBootstrap } from "../../../../../_shared/auth";
import { getProjectStatsPayload, getShotCharacterCounts } from "../../../../../_shared/observability";
import {
  getParam,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../../../_shared/http";

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

    const projectId = getParam(req, "id");
    if (!projectId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const [payload, appearances] = await Promise.all([
      getProjectStatsPayload(projectId),
      getShotCharacterCounts(projectId),
    ]);

    sendJson(res, 200, {
      total_characters: payload.characters.length,
      appearances,
      most_featured: appearances[0] || null,
      least_featured: appearances.length ? appearances[appearances.length - 1] : null,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
