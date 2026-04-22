/**
 * Legacy migration endpoint placeholder.
 */

import {
  type RequestLike,
  type ResponseLike,
  sendMethodNotAllowed,
  sendNotImplemented,
} from "../_shared/http";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  sendNotImplemented(
    res,
    "KV-to-Postgres migration is obsolete. Use Appwrite schema changes or your own migration tooling, not this endpoint.",
  );
}
