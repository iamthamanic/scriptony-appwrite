/**
 * Legacy migration endpoint placeholder.
 */

import { sendMethodNotAllowed, sendNotImplemented, type RequestLike, type ResponseLike } from "../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  sendNotImplemented(
    res,
    "KV-to-Postgres migration is obsolete in the Nhost backend. Use Nhost migrations instead."
  );
}
