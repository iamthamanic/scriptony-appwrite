/**
 * Root endpoint for the Scriptony auth service.
 *
 * Keeps the `scriptony-auth` base path alive for routing probes.
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
    provider: "appwrite",
    timestamp: new Date().toISOString(),
  });
}
