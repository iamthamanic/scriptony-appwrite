/**
 * Health endpoint for the beats service.
 */

import { requestGraphql } from "../_shared/graphql-compat";
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
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
