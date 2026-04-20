/**
 * Dedicated image settings route backed by central ai-service settings.
 * GET returns the user's feature config for image_generation.
 * PUT updates the feature config.
 *
 * Location: functions/scriptony-image/ai/image-settings.ts
 */

import {
  getAISettings,
  updateFeatureConfig,
} from "../../_shared/ai-service/config/settings";
import { requireAuthenticatedUser } from "../../_shared/auth";
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
    const user = await requireAuthenticatedUser(req);
    if (!user) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const settings = await getAISettings(user.id);
      sendJson(res, 200, { settings });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = await readJsonBody<{
        provider?: string;
        model?: string;
        voice?: string;
      }>(req);
      if (body.provider || body.model) {
        await updateFeatureConfig(user.id, "image_generation", {
          provider: body.provider || "",
          model: body.model || "",
          voice: body.voice || "",
        });
      }
      const settings = await getAISettings(user.id);
      sendJson(res, 200, { settings });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
