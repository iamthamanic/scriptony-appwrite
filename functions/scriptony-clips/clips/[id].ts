/**
 * Single clip: GET / PUT / DELETE
 */

import { requireUserBootstrap } from "../../_shared/auth";
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
} from "../../_shared/http";
import {
  C,
  deleteDocument,
  getDocument,
  updateDocument,
} from "../../_shared/appwrite-db";
import { mapClip } from "../../_shared/clips-map";
import {
  getAccessibleProject,
  getUserOrganizationIds,
} from "../../_shared/scriptony";

const MIN_CLIP_DURATION_SEC = 1;

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

    const clipId = getParam(req, "id");
    if (!clipId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const organizationIds = await getUserOrganizationIds(bootstrap.user.id);

    const row = await getDocument(C.clips, clipId);
    if (!row) {
      sendNotFound(res, "Clip not found");
      return;
    }

    const projectId = String(row.project_id || "");
    const project = await getAccessibleProject(
      projectId,
      bootstrap.user.id,
      organizationIds,
    );
    if (!project) {
      sendNotFound(res, "Project not found");
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, { clip: mapClip(row) });
      return;
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = await readJsonBody<Record<string, unknown>>(req);
      const updates: Record<string, unknown> = {};

      const startSec = body.start_sec ?? body.startSec;
      const endSec = body.end_sec ?? body.endSec;
      if (startSec !== undefined) updates.start_sec = Number(startSec);
      if (endSec !== undefined) updates.end_sec = Number(endSec);

      if (body.shot_id !== undefined || body.shotId !== undefined) {
        sendBadRequest(res, "shot_id cannot be changed");
        return;
      }
      if (body.scene_id !== undefined || body.sceneId !== undefined) {
        sendBadRequest(res, "scene_id cannot be changed");
        return;
      }
      if (body.project_id !== undefined || body.projectId !== undefined) {
        sendBadRequest(res, "project_id cannot be changed");
        return;
      }

      if (body.lane_index !== undefined || body.laneIndex !== undefined) {
        const v = body.lane_index ?? body.laneIndex;
        updates.lane_index = typeof v === "number"
          ? v
          : parseInt(String(v), 10) || 0;
      }
      if (body.order_index !== undefined || body.orderIndex !== undefined) {
        const v = body.order_index ?? body.orderIndex;
        updates.order_index = typeof v === "number"
          ? v
          : parseInt(String(v), 10) || 0;
      }
      const si = body.source_in_sec ?? body.sourceInSec;
      const so = body.source_out_sec ?? body.sourceOutSec;
      if (si !== undefined) {
        updates.source_in_sec = si === null ? null : Number(si);
      }
      if (so !== undefined) {
        updates.source_out_sec = so === null ? null : Number(so);
      }

      const nextStart = updates.start_sec !== undefined
        ? Number(updates.start_sec)
        : Number(row.start_sec);
      const nextEnd = updates.end_sec !== undefined
        ? Number(updates.end_sec)
        : Number(row.end_sec);
      if (
        !Number.isFinite(nextStart) ||
        !Number.isFinite(nextEnd) ||
        nextEnd - nextStart < MIN_CLIP_DURATION_SEC
      ) {
        sendBadRequest(res, "Invalid start_sec/end_sec");
        return;
      }

      const updated = await updateDocument(C.clips, clipId, updates);
      sendJson(res, 200, { clip: mapClip(updated) });
      return;
    }

    if (req.method === "DELETE") {
      await deleteDocument(C.clips, clipId);
      sendJson(res, 200, { success: true });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT", "PATCH", "DELETE"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
