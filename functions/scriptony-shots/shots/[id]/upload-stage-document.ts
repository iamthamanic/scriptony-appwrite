/**
 * POST /shots/:id/upload-stage-document — StageDocument-JSON in Storage, Shot-Feld setzen.
 * Body: { kind: "stage2d" | "stage3d", json: string } oder { kind, document: object }
 */
import { requireUserBootstrap } from "../../../_shared/auth";
import { getStorageBucketId } from "../../../_shared/env";
import { requestGraphql } from "../../../_shared/graphql-compat";
import {
  getParam,
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../../../_shared/http";
import { uploadFileToStorage } from "../../../_shared/storage";
import {
  getAccessibleProject,
  getUserOrganizationIds,
} from "../../../_shared/scriptony";
import { getShotById, mapShot } from "../../../_shared/timeline";
import { Buffer } from "node:buffer";

const MAX_JSON_BYTES = 15 * 1024 * 1024;

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
    const project = await getAccessibleProject(
      shot.project_id,
      bootstrap.user.id,
      organizationIds,
    );
    if (!project) {
      sendNotFound(res, "Shot not found");
      return;
    }

    const body = await readJsonBody<Record<string, unknown>>(req);
    const kind = body.kind === "stage3d"
      ? "stage3d"
      : body.kind === "stage2d"
      ? "stage2d"
      : null;
    if (!kind) {
      sendBadRequest(res, 'kind must be "stage2d" or "stage3d"');
      return;
    }

    const json = typeof body.json === "string"
      ? body.json
      : body.document !== undefined
      ? JSON.stringify(body.document)
      : null;
    if (typeof json !== "string" || !json.trim()) {
      sendBadRequest(res, "json (string) or document (object) required");
      return;
    }

    const bytes = Buffer.byteLength(json, "utf8");
    if (bytes > MAX_JSON_BYTES) {
      sendBadRequest(res, `document exceeds ${MAX_JSON_BYTES} bytes`);
      return;
    }

    const file = new File([json], `${shotId}-stage-${kind}.json`, {
      type: "application/json",
    });

    const uploaded = await uploadFileToStorage({
      file,
      bucketId: getStorageBucketId("stageDocuments"),
      name: `${shotId}-${kind}-${Date.now()}.json`,
      metadata: {
        entity: "shot",
        entityId: shotId,
        projectId: shot.project_id,
        uploadedBy: bootstrap.user.id,
        stageKind: kind,
      },
    });

    if (kind === "stage2d") {
      await requestGraphql(
        `
          mutation UpdateShotStage2d($id: uuid!, $fid: String!, $userId: uuid!) {
            update_shots_by_pk(
              pk_columns: { id: $id }
              _set: { stage2d_file_id: $fid, user_id: $userId }
            ) {
              id
            }
          }
        `,
        { id: shotId, fid: uploaded.id, userId: bootstrap.user.id },
      );
    } else {
      await requestGraphql(
        `
          mutation UpdateShotStage3d($id: uuid!, $fid: String!, $userId: uuid!) {
            update_shots_by_pk(
              pk_columns: { id: $id }
              _set: { stage3d_file_id: $fid, user_id: $userId }
            ) {
              id
            }
          }
        `,
        { id: shotId, fid: uploaded.id, userId: bootstrap.user.id },
      );
    }

    const fresh = await getShotById(shotId);
    sendJson(res, 200, {
      fileId: uploaded.id,
      fileUrl: uploaded.url,
      shot: fresh ? mapShot(fresh) : undefined,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
