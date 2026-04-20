/**
 * World image upload route for the Scriptony worldbuilding service.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import { getStorageBucketId } from "../../../_shared/env";
import { requestGraphql } from "../../../_shared/graphql-compat";
import {
  getParam,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../../../_shared/http";
import { ensureFile, uploadFileToStorage } from "../../../_shared/storage";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
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

    const worldId = getParam(req, "id");
    if (!worldId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const world = await requestGraphql<{
      worlds_by_pk: { id: string; organization_id: string } | null;
    }>(
      `
        query GetWorldForUpload($id: uuid!) {
          worlds_by_pk(id: $id) {
            id
            organization_id
          }
        }
      `,
      { id: worldId },
    );

    if (
      !world.worlds_by_pk ||
      world.worlds_by_pk.organization_id !== bootstrap.organizationId
    ) {
      sendNotFound(res, "World not found");
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
      bucketId: getStorageBucketId("worldImages"),
      name: `${worldId}-cover-${Date.now()}.${ext}`,
      metadata: {
        entity: "world",
        entityId: worldId,
        uploadedBy: bootstrap.user.id,
      },
    });

    await requestGraphql(
      `
        mutation UpdateWorldCoverImage($id: uuid!, $imageUrl: String!) {
          update_worlds_by_pk(
            pk_columns: { id: $id }
            _set: { cover_image_url: $imageUrl }
          ) {
            id
          }
        }
      `,
      {
        id: worldId,
        imageUrl: uploaded.url,
      },
    );

    sendJson(res, 200, { imageUrl: uploaded.url });
  } catch (error) {
    sendServerError(res, error);
  }
}
