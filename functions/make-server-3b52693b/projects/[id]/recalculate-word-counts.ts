/**
 * Legacy word-count recalculation endpoint.
 *
 * Historical no-op: book scene word counts were once recalculated server-side.
 * This endpoint remains so older admin UI calls do not hard-fail until ported.
 */

import { getParam, sendBadRequest, sendJson, sendMethodNotAllowed, type RequestLike, type ResponseLike } from "../../../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  const projectId = getParam(req, "id");
  if (!projectId) {
    sendBadRequest(res, "Project ID is required");
    return;
  }

  sendJson(res, 200, {
    success: true,
    updated: 0,
    projectId,
    note: "Word-count recalculation has not been ported to the Appwrite-backed stack yet.",
  });
}
