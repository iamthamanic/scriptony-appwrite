/**
 * Health endpoint for the Nhost-backed beats compatibility surface.
 */

import { requestGraphql } from "../_shared/hasura";
import { sendJson, sendMethodNotAllowed, sendServerError, type RequestLike, type ResponseLike } from "../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    await requestGraphql<{ story_beats_aggregate: { aggregate: { count: number } } }>(
      `
        query BeatsHealthcheck {
          story_beats_aggregate {
            aggregate {
              count
            }
          }
        }
      `
    );

    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-beats",
      provider: "nhost",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
