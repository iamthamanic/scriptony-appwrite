/**
 * Legacy signup HTTP route stub.
 *
 * Appwrite handles signup via its own Account API / Web SDK.
 * This route exists only so the auth router doesn't 404 on /signup —
 * it returns a helpful message directing callers to the SDK.
 */

import {
  sendJson,
  sendMethodNotAllowed,
  type RequestLike,
  type ResponseLike,
} from "../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  sendJson(res, 501, {
    error: "Signup is handled by the Appwrite SDK. Use the client-side Account.create() flow.",
  });
}
