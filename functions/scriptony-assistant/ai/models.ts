/**
 * AI models route for the Nhost compatibility layer.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import {
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";
import { getProviderModels } from "./settings";
import { requestGraphql } from "../../../_shared/hasura";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const settings = await requestGraphql<{
      ai_chat_settings: Array<{ active_provider: string }>;
    }>(
      `
        query GetActiveProvider($userId: uuid!) {
          ai_chat_settings(where: { user_id: { _eq: $userId } }, limit: 1) {
            active_provider
          }
        }
      `,
      { userId: bootstrap.user.id }
    );

    const provider = settings.ai_chat_settings[0]?.active_provider || "openai";
    sendJson(res, 200, { models: getProviderModels(provider) });
  } catch (error) {
    sendServerError(res, error);
  }
}
