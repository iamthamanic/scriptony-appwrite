/**
 * Project image upload route for the Nhost-backed projects layer.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import { getStorageBucketId } from "../../../_shared/env";
import { requestGraphql } from "../../../_shared/hasura";
import {
  getParam,
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
import { getAccessibleProject } from "../../../_shared/scriptony";

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

    const projectId = getParam(req, "id");
    if (!projectId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const project = await getAccessibleProject(projectId, bootstrap.user.id, [bootstrap.organizationId]);
    if (!project) {
      sendNotFound(res, "Project not found");
      return;
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
      bucketId: getStorageBucketId("projectImages"),
      name: `${projectId}-cover-${Date.now()}.${ext}`,
      metadata: {
        entity: "project",
        entityId: projectId,
        uploadedBy: bootstrap.user.id,
      },
    });

    await requestGraphql(
      `
        mutation UpdateProjectCoverImage($id: uuid!, $imageUrl: String!) {
          update_projects_by_pk(
            pk_columns: { id: $id }
            _set: { cover_image_url: $imageUrl }
          ) {
            id
          }
        }
      `,
      {
        id: projectId,
        imageUrl: uploaded.url,
      }
    );

    sendJson(res, 200, { imageUrl: uploaded.url });
  } catch (error) {
    sendServerError(res, error);
  }
}
