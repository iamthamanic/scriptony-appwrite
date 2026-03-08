/**
 * RAG sync queue route for the Nhost compatibility layer.
 */

import { requireUserBootstrap } from "../../../../_shared/auth";
import { requestGraphql } from "../../../../_shared/hasura";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../../_shared/http";

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

    const body = await readJsonBody<Record<string, any>>(req);
    const projectId = body.project_id ?? body.projectId ?? null;

    const created = await requestGraphql<{
      insert_rag_sync_queue_one: Record<string, any>;
    }>(
      `
        mutation QueueRagSync($object: rag_sync_queue_insert_input!) {
          insert_rag_sync_queue_one(object: $object) {
            id
            created_at
            processed
          }
        }
      `,
      {
        object: {
          organization_id: bootstrap.organizationId,
          user_id: bootstrap.user.id,
          entity_type: "projects",
          operation: "UPSERT",
          entity_id: projectId ?? bootstrap.user.id,
          data: body,
          processed: false,
        },
      }
    );

    sendJson(res, 202, {
      success: true,
      sync_job: created.insert_rag_sync_queue_one,
      message: "RAG sync queued",
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
