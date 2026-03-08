/**
 * Health endpoint for the Nhost-backed projects compatibility surface.
 */

import { requestGraphql } from "../_shared/hasura";
import { sendJson, sendMethodNotAllowed, sendServerError, type RequestLike, type ResponseLike } from "../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    await requestGraphql<{ projects_aggregate: { aggregate: { count: number } } }>(
      `
        query ProjectsHealthcheck {
          projects_aggregate {
            aggregate {
              count
            }
          }
        }
      `
    );

    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-projects",
      provider: "nhost",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
