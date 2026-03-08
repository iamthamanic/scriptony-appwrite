/**
 * Legacy SQL migration endpoint placeholder.
 */

import { sendMethodNotAllowed, sendNotImplemented, type RequestLike, type ResponseLike } from "../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  sendNotImplemented(
    res,
    "SQL migration execution should happen through Nhost CLI migrations, not runtime functions."
  );
}
