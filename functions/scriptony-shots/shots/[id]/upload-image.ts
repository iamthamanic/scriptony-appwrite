/**
 * Shot image upload route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import { getStorageBucketId } from "../../../_shared/env";
import { requestGraphql } from "../../../_shared/graphql-compat";
import {
  getParam,
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";
import { ensureFile, uploadFileToStorage } from "../../../_shared/storage";
import { getAccessibleProject, getUserOrganizationIds } from "../../../_shared/scriptony";
import { getShotById } from "../../../_shared/timeline";

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

    const shotId = getParam(req, "id");
    if (!shotId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const shot = await getShotById(shotId);
    if (!shot?.project_id) {
      sendNotFound(res, "Shot not found");
      return;
    }

    const organizationIds = await getUserOrganizationIds(bootstrap.user.id);
    const project = await getAccessibleProject(shot.project_id, bootstrap.user.id, organizationIds);
    if (!project) {
      sendNotFound(res, "Shot not found");
      return;
    }

    // Normalize JSON body (Appwrite sometimes delivers a string; ensureFile reads req.body)
    const parsed = await readJsonBody<Record<string, unknown>>(req);
    if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
      req.body = parsed;
    }

    const file = ensureFile(req, res, {
      maxSizeBytes: 5 * 1024 * 1024,
      accept: ["image/"],
    });
    if (!file) {
      return;
    }

    const ext = file.name.split(".").pop() || "jpg";
    const uploaded = await uploadFileToStorage({
      file,
      bucketId: getStorageBucketId("shotImages"),
      name: `${shotId}-${Date.now()}.${ext}`,
      metadata: {
        entity: "shot",
        entityId: shotId,
        projectId: shot.project_id,
        uploadedBy: bootstrap.user.id,
      },
    });

    const mime = typeof file.type === "string" && file.type.startsWith("image/") ? file.type : "image/jpeg";

    await requestGraphql(
      `
        mutation UpdateShotImage($id: uuid!, $imageUrl: String!, $userId: uuid!, $shotImageMime: String!) {
          update_shots_by_pk(
            pk_columns: { id: $id }
            _set: { image_url: $imageUrl, user_id: $userId, shot_image_mime: $shotImageMime }
          ) {
            id
          }
        }
      `,
      {
        id: shotId,
        imageUrl: uploaded.url,
        userId: bootstrap.user.id,
        shotImageMime: mime,
      }
    );

    sendJson(res, 200, { imageUrl: uploaded.url });
  } catch (error) {
    sendServerError(res, error);
  }
}
