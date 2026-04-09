/**
 * Generic storage upload endpoint for legacy frontend helpers.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { getStorageBucketId } from "../../_shared/env";
import {
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import { ensureFile, getMultipartField, uploadFileToStorage } from "../../_shared/storage";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const file = ensureFile(req, res, {
      maxSizeBytes: 10 * 1024 * 1024,
      accept: ["image/"],
    });
    if (!file) {
      return;
    }

    const folder = getMultipartField(req, "folder") || "general";
    const ext = file.name.split(".").pop() || "jpg";
    const uploaded = await uploadFileToStorage({
      file,
      bucketId: getStorageBucketId("general"),
      name: `${folder}-${bootstrap.user.id}-${Date.now()}.${ext}`,
      metadata: {
        folder,
        uploadedBy: bootstrap.user.id,
      },
    });

    sendJson(res, 200, {
      url: uploaded.url,
      path: uploaded.id,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
