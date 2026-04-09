/**
 * AI conversation messages routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../../_shared/auth";
import { requestGraphql } from "../../../../_shared/graphql-compat";
import {
  getParam,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const conversationId = getParam(req, "id");
    if (!conversationId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const data = await requestGraphql<{
      ai_chat_messages: Array<Record<string, any>>;
    }>(
      `
        query GetConversationMessages($conversationId: uuid!) {
          ai_chat_messages(
            where: { conversation_id: { _eq: $conversationId } }
            order_by: { created_at: asc }
          ) {
            id
            conversation_id
            role
            content
            model
            provider
            tokens_used
            tool_calls
            created_at
          }
        }
      `,
      { conversationId }
    );

    sendJson(res, 200, { messages: data.ai_chat_messages });
  } catch (error) {
    sendServerError(res, error);
  }
}
