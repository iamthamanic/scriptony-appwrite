/**
 * Legacy word-count recalculation endpoint.
 *
 * The original Supabase function recalculated book scene counts server-side.
 * During the Nhost migration this remains a no-op compatibility endpoint so the
 * admin UI can continue to call it without crashing.
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
    note: "Word-count recalculation has not been ported to the Nhost backend yet.",
  });
}
