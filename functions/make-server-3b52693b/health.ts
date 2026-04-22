/**
 * Minimal health endpoint for legacy routes still pointing at the old main server.
 */

import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendMethodNotAllowed,
} from "../_shared/http";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  sendJson(res, 200, {
    status: "ok",
    service: "make-server-3b52693b",
    provider: "appwrite",
    message:
      "Legacy main-server routes; data plane is Appwrite-backed Scriptony functions.",
    timestamp: new Date().toISOString(),
  });
}
