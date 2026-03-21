/**
 * AI conversation prompt routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../../../_shared/auth";
import { requestGraphql } from "../../../../../_shared/graphql-compat";
import {
  getParam,
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../../../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "PUT") {
      sendMethodNotAllowed(res, ["PUT"]);
      return;
    }

    const conversationId = getParam(req, "id");
    if (!conversationId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const body = await readJsonBody<{ system_prompt?: string; prompt?: string }>(req);
    const systemPrompt = body.system_prompt ?? body.prompt ?? "";

    const updated = await requestGraphql<{
      update_ai_conversations_by_pk: Record<string, any> | null;
    }>(
      `
        mutation UpdateConversationPrompt($id: uuid!, $systemPrompt: String) {
          update_ai_conversations_by_pk(
            pk_columns: { id: $id }
            _set: { system_prompt: $systemPrompt }
          ) {
            id
            title
            system_prompt
            message_count
            last_message_at
            created_at
            updated_at
          }
        }
      `,
      { id: conversationId, systemPrompt }
    );

    sendJson(res, 200, { conversation: updated.update_ai_conversations_by_pk });
  } catch (error) {
    sendServerError(res, error);
  }
}
