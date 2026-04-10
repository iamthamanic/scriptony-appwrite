/**
 * Dedicated image settings route backed by central `scriptony_ai`.
 */

import { getLegacyImageSettings, updateLegacyImageSettings } from "../../_shared/ai-central-store";
import { requireAuthenticatedUser } from "../../_shared/auth";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";

function buildFallbackImageSettings(userId: string) {
  return {
    id: `fallback-image-settings:${userId}`,
    user_id: userId,
    settings_json: "{}",
    settings_json_parsed: {},
    image_provider: "ollama" as const,
    ollama_image_api_key: "",
    openrouter_image_api_key: "",
  };
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      let settings;
      try {
        settings = await getLegacyImageSettings(user.id);
      } catch (error) {
        console.warn("[scriptony-image] image settings fallback", {
          userId: user.id,
          message: error instanceof Error ? error.message : String(error),
        });
        settings = buildFallbackImageSettings(user.id);
      }
      sendJson(res, 200, { settings });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = await readJsonBody<Record<string, unknown>>(req);
      const settings = await updateLegacyImageSettings(user.id, body);
      sendJson(res, 200, { settings });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
