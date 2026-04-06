/**
 * Dedicated image settings route backed by central `scriptony_ai`.
 */

import { getLegacyImageSettings, updateLegacyImageSettings } from "../../_shared/ai-central-store";
import { requireImageFunctionUser } from "../../_shared/image-function-auth";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const user = await requireImageFunctionUser(req.headers.authorization);
    if (!user) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const settings = await getLegacyImageSettings(user.id);
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
