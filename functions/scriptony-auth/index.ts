/**
 * Root endpoint for the Nhost-backed auth compatibility surface.
 *
 * Keeps the old `scriptony-auth` base path alive during the migration.
 */

import { sendJson, sendMethodNotAllowed, type RequestLike, type ResponseLike } from "../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  sendJson(res, 200, {
    status: "ok",
    service: "scriptony-auth",
    provider: "nhost",
    timestamp: new Date().toISOString(),
  });
}
