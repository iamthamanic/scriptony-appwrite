/**
 * Token counting route for the Nhost compatibility layer.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  const bootstrap = await requireUserBootstrap(req.headers.authorization);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  const body = await readJsonBody<{ text?: string; messages?: Array<{ content?: string }> }>(req);
  const messageText = Array.isArray(body.messages)
    ? body.messages.map((entry) => entry.content || "").join(" ")
    : body.text || "";
  const tokens = messageText.trim() ? messageText.trim().split(/\s+/).length : 0;

  sendJson(res, 200, {
    token_count: tokens,
    input_tokens: tokens,
    output_tokens: 0,
    total_tokens: tokens,
  });
}
