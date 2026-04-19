/**
 * Integration tokens collection: list (GET) and create (POST).
 * Long-lived tokens for external tools (e.g. ComfyUI/Blender) to call Scriptony API.
 */

import { randomBytes } from "crypto";
import { hashIntegrationToken, requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const data = await requestGraphql<{
        user_integration_tokens: Array<{
          id: string;
          name: string;
          created_at: string;
        }>;
      }>(
        `
          query ListIntegrationTokens($userId: uuid!) {
            user_integration_tokens(
              where: { user_id: { _eq: $userId } }
              order_by: { created_at: desc }
            ) {
              id
              name
              created_at
            }
          }
        `,
        { userId: bootstrap.user.id },
      );

      sendJson(res, 200, {
        tokens: data?.user_integration_tokens ?? [],
      });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<{ name?: string }>(req);
      const name = (body.name ?? "External Tool").trim().slice(0, 100) ||
        "External Tool";

      const plainToken = randomBytes(32).toString("hex");
      const tokenHash = hashIntegrationToken(plainToken);

      const inserted = await requestGraphql<{
        insert_user_integration_tokens_one: {
          id: string;
          name: string;
          created_at: string;
        } | null;
      }>(
        `
          mutation CreateIntegrationToken(
            $object: user_integration_tokens_insert_input!
          ) {
            insert_user_integration_tokens_one(object: $object) {
              id
              name
              created_at
            }
          }
        `,
        {
          object: {
            user_id: bootstrap.user.id,
            token_hash: tokenHash,
            name,
          },
        },
      );

      const row = inserted?.insert_user_integration_tokens_one;
      if (!row) {
        sendServerError(res, new Error("Failed to create token"));
        return;
      }

      sendJson(res, 201, {
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        token: plainToken,
      });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
