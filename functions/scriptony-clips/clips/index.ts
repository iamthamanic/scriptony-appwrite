/**
 * Clips CRUD — editorial timeline segments (Phase 1 Clip domain).
 *
 * T13 TIMELINE DOMAIN: Clip-CRUD und Timing.
 *   Neue Timeline-Features nur mit expliziter Zielentscheidung.
 *   Siehe docs/timeline-domain-decision.md
 */

import { Query } from "node-appwrite";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  getQuery,
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
  createDocument,
  listDocumentsFull,
} from "../../_shared/appwrite-db";
import { mapClip } from "../../_shared/clips-map";
import { getShotById } from "../../_shared/timeline";
import {
  getAccessibleProject,
  getUserOrganizationIds,
} from "../../_shared/scriptony";

const MIN_CLIP_DURATION_SEC = 1;

function clipPayloadFromBody(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const projectId = (body.project_id ?? body.projectId) as string | undefined;
  const shotId = (body.shot_id ?? body.shotId) as string | undefined;
  const sceneId = (body.scene_id ?? body.sceneId) as string | undefined;
  const startSec = Number(body.start_sec ?? body.startSec);
  const endSec = Number(body.end_sec ?? body.endSec);
  const laneIndex = body.lane_index ?? body.laneIndex;
  const orderIndex = body.order_index ?? body.orderIndex;

  if (!projectId?.trim() || !shotId?.trim() || !sceneId?.trim()) {
    return null;
  }
  if (
    !Number.isFinite(startSec) ||
    !Number.isFinite(endSec) ||
    endSec - startSec < MIN_CLIP_DURATION_SEC
  ) {
    return null;
  }

  const out: Record<string, unknown> = {
    project_id: projectId.trim(),
    shot_id: shotId.trim(),
    scene_id: sceneId.trim(),
    start_sec: startSec,
    end_sec: endSec,
    lane_index:
      typeof laneIndex === "number"
        ? laneIndex
        : parseInt(String(laneIndex ?? 0), 10) || 0,
    order_index:
      typeof orderIndex === "number"
        ? orderIndex
        : parseInt(String(orderIndex ?? 0), 10) || 0,
  };

  const si = body.source_in_sec ?? body.sourceInSec;
  const so = body.source_out_sec ?? body.sourceOutSec;
  if (si !== undefined && si !== null && Number.isFinite(Number(si))) {
    out.source_in_sec = Number(si);
  }
  if (so !== undefined && so !== null && Number.isFinite(Number(so))) {
    out.source_out_sec = Number(so);
  }

  return out;
}

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

    const organizationIds = await getUserOrganizationIds(bootstrap.user.id);

    if (req.method === "GET") {
      const projectId =
        getQuery(req, "project_id") || getQuery(req, "projectId");
      const shotId = getQuery(req, "shot_id") || getQuery(req, "shotId");

      if (projectId) {
        const project = await getAccessibleProject(
          projectId,
          bootstrap.user.id,
          organizationIds,
        );
        if (!project) {
          sendNotFound(res, "Project not found");
          return;
        }
        const rows = await listDocumentsFull(C.clips, [
          Query.equal("project_id", projectId),
        ]);
        sendJson(res, 200, { clips: rows.map(mapClip) });
        return;
      }

      if (shotId) {
        const shot = await getShotById(shotId);
        if (!shot?.project_id) {
          sendNotFound(res, "Shot not found");
          return;
        }
        const project = await getAccessibleProject(
          String(shot.project_id),
          bootstrap.user.id,
          organizationIds,
        );
        if (!project) {
          sendNotFound(res, "Project not found");
          return;
        }
        const rows = await listDocumentsFull(C.clips, [
          Query.equal("shot_id", shotId),
        ]);
        sendJson(res, 200, { clips: rows.map(mapClip) });
        return;
      }

      sendBadRequest(res, "project_id or shot_id is required");
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<Record<string, unknown>>(req);
      const payload = clipPayloadFromBody(body);
      if (!payload) {
        sendBadRequest(
          res,
          "project_id, shot_id, scene_id, start_sec, end_sec required; duration must be >= " +
            MIN_CLIP_DURATION_SEC +
            "s",
        );
        return;
      }

      const projectId = payload.project_id as string;
      const project = await getAccessibleProject(
        projectId,
        bootstrap.user.id,
        organizationIds,
      );
      if (!project) {
        sendNotFound(res, "Project not found");
        return;
      }

      const shot = await getShotById(payload.shot_id as string);
      if (!shot || String(shot.project_id) !== projectId) {
        sendBadRequest(res, "shot_id invalid for project");
        return;
      }
      if (String(shot.scene_id) !== String(payload.scene_id)) {
        sendBadRequest(res, "scene_id does not match shot");
        return;
      }

      const dup = await listDocumentsFull(C.clips, [
        Query.equal("project_id", projectId),
        Query.equal("shot_id", payload.shot_id as string),
      ]);
      if (dup.length > 0) {
        sendBadRequest(
          res,
          "A clip already exists for this shot (Phase 1: one editorial clip per shot)",
        );
        return;
      }

      const created = await createDocument(C.clips, undefined, payload);
      sendJson(res, 201, { clip: mapClip(created) });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
