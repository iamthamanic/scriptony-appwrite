/**
 * AI conversation collection routes for the Scriptony HTTP API.
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
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const data = await requestGraphql<{
        ai_conversations: Array<Record<string, any>>;
      }>(
        `
          query GetAiConversations($userId: uuid!) {
            ai_conversations(
              where: { user_id: { _eq: $userId } }
              order_by: [{ updated_at: desc }, { created_at: desc }]
            ) {
              id
              user_id
              title
              system_prompt
              message_count
              last_message_at
              created_at
              updated_at
            }
          }
        `,
        { userId: bootstrap.user.id }
      );

      sendJson(res, 200, { conversations: data.ai_conversations });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<Record<string, any>>(req);
      const title = body.title?.trim() || "Neue Unterhaltung";

      const created = await requestGraphql<{
        insert_ai_conversations_one: Record<string, any>;
      }>(
        `
          mutation CreateAiConversation($object: ai_conversations_insert_input!) {
            insert_ai_conversations_one(object: $object) {
              id
              user_id
              title
              system_prompt
              message_count
              last_message_at
              created_at
              updated_at
            }
          }
        `,
        {
          object: {
            user_id: bootstrap.user.id,
            title,
            system_prompt: body.system_prompt ?? null,
            message_count: 0,
          },
        }
      );

      sendJson(res, 201, { conversation: created.insert_ai_conversations_one });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
