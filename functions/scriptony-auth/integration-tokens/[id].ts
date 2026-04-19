/**
 * Single integration token: revoke (DELETE).
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  getParam,
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
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

    if (req.method !== "DELETE") {
      sendMethodNotAllowed(res, ["DELETE"]);
      return;
    }

    const id = getParam(req, "id");
    if (!id) {
      sendNotFound(res, "Token id required");
      return;
    }

    const existing = await requestGraphql<{
      user_integration_tokens_by_pk: { id: string; user_id: string } | null;
    }>(
      `
        query GetIntegrationToken($id: uuid!) {
          user_integration_tokens_by_pk(id: $id) {
            id
            user_id
          }
        }
      `,
      { id },
    );

    const row = existing?.user_integration_tokens_by_pk;
    if (!row || row.user_id !== bootstrap.user.id) {
      sendNotFound(res, "Token not found");
      return;
    }

    await requestGraphql(
      `
        mutation DeleteIntegrationToken($id: uuid!) {
          delete_user_integration_tokens_by_pk(id: $id) {
            id
          }
        }
      `,
      { id },
    );

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendServerError(res, error);
  }
}
