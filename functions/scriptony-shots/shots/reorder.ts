/**
 * Shot reorder route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import { requestGraphql } from "../../../_shared/graphql-compat";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const body = await readJsonBody<{ shot_ids?: string[]; shotIds?: string[] }>(req);
    const shotIds = Array.isArray(body.shot_ids)
      ? body.shot_ids
      : Array.isArray(body.shotIds)
        ? body.shotIds
        : [];

    if (shotIds.length === 0) {
      sendBadRequest(res, "shot_ids is required");
      return;
    }

    await Promise.all(
      shotIds.map((id, index) =>
        requestGraphql(
          `
            mutation ReorderShot($id: uuid!, $orderIndex: Int!, $userId: uuid!) {
              update_shots_by_pk(
                pk_columns: { id: $id }
                _set: { order_index: $orderIndex, user_id: $userId }
              ) {
                id
              }
            }
          `,
          { id, orderIndex: index, userId: bootstrap.user.id }
        )
      )
    );

    sendJson(res, 200, { success: true });
  } catch (error) {
    sendServerError(res, error);
  }
}
