/**
 * Health endpoint for the auth service.
 */

import { requestGraphql } from "../_shared/graphql-compat";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from "../_shared/http";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    await requestGraphql<{
      organizations_aggregate: { aggregate: { count: number } };
    }>(
      `
        query AuthHealthcheck {
          organizations_aggregate {
            aggregate {
              count
            }
          }
        }
      `,
    );

    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-auth",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
