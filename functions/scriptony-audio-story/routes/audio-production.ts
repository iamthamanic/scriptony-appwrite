/**
 * Audio Production Orchestration Routes — T08.
 *
 * Verantwortung:
 *   - generate-from-script: Snapshot erstellen + Job erzeugen
 *   - preview: Job für Preview-Mix erzeugen
 *   - export: Job für Export erzeugen
 *   - job status: Job-Status aus Control-Plane lesen
 *
 * SOLID: Nutzt JobService + SnapshotService (DIP).
 * Keine TTS-Engine-Logik hier — die bleibt in scriptony-audio.
 * Keine Asset-Speicherlogik hier — die bleibt in scriptony-assets.
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  getParam,
  getQuery,
  readJsonBody,
  sendJson,
  sendBadRequest,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
  sendMethodNotAllowed,
} from "../../_shared/http";
import { requestGraphql } from "../../_shared/graphql-compat";
import { canReadProject, canEditProject } from "../_shared/access";
import {
  createAudioProductionJob,
  getAudioProductionJob,
} from "../_shared/job-service";
import { createSnapshot, buildSnapshotJson } from "../_shared/snapshot-service";

interface ScriptBlock {
  id: string;
  type: string;
  content?: string;
  speaker_character_id?: string;
  order_index: number;
}

/**
 * POST /audio-production/generate
 * Input: { project_id, scene_id?, script_id?, block_ids?[] }
 * Erzeugt Snapshot aus Script-Blocks + erstellt Job für TTS-Generierung.
 */
async function generateFromScript(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody<Record<string, unknown>>(req);
  const projectId = body.project_id;
  const sceneId = body.scene_id;
  const scriptId = body.script_id;
  const blockIds = Array.isArray(body.block_ids)
    ? (body.block_ids as string[])
    : undefined;

  if (!projectId || typeof projectId !== "string") {
    sendBadRequest(res, "project_id is required");
    return;
  }
  if (!(await canEditProject(bootstrap.user.id, projectId))) {
    sendUnauthorized(res);
    return;
  }

  // Script-Blocks aus DB lesen
  let blocks: ScriptBlock[];
  try {
    if (blockIds && blockIds.length > 0) {
      // Direkte Block-IDs
      const data = await requestGraphql<{
        script_blocks: ScriptBlock[];
      }>(
        `
        query GetBlocks($ids: [uuid!]!) {
          script_blocks(where: { id: { _in: $ids } }) {
            id
            type
            content
            speaker_character_id
            order_index
          }
        }
      `,
        { ids: blockIds },
      );
      blocks = data.script_blocks;
    } else if (sceneId) {
      // Alle Blocks der Szene über node_id
      const data = await requestGraphql<{
        script_blocks: ScriptBlock[];
      }>(
        `
        query GetSceneBlocks($sceneId: uuid!) {
          script_blocks(
            where: { node_id: { _eq: $sceneId } }
            order_by: { order_index: asc }
          ) {
            id
            type
            content
            speaker_character_id
            order_index
          }
        }
      `,
        { sceneId },
      );
      blocks = data.script_blocks;
    } else if (scriptId) {
      // Alle Blocks des Scripts
      const data = await requestGraphql<{
        script_blocks: ScriptBlock[];
      }>(
        `
        query GetScriptBlocks($scriptId: uuid!) {
          script_blocks(
            where: { script_id: { _eq: $scriptId } }
            order_by: { order_index: asc }
          ) {
            id
            type
            content
            speaker_character_id
            order_index
          }
        }
      `,
        { scriptId },
      );
      blocks = data.script_blocks;
    } else {
      sendBadRequest(res, "scene_id, script_id, or block_ids required");
      return;
    }
  } catch (error) {
    console.error("[Audio Production] Error fetching script blocks:", error);
    sendServerError(res, error);
    return;
  }

  if (blocks.length === 0) {
    sendBadRequest(res, "No script blocks found");
    return;
  }

  // Snapshot erstellen
  let snapshotId: string;
  try {
    const snapshot = await createSnapshot({
      project_id: projectId,
      scene_id: typeof sceneId === "string" ? sceneId : undefined,
      script_id: typeof scriptId === "string" ? scriptId : undefined,
      block_references: blocks.map((b) => ({
        id: b.id,
        type: b.type,
        order_index: b.order_index,
      })),
      snapshot_json: buildSnapshotJson(
        typeof scriptId === "string" ? scriptId : "unknown",
        blocks,
      ),
      created_by: bootstrap.user.id,
    });
    snapshotId = snapshot.id;
  } catch (error) {
    console.error("[Audio Production] Error creating snapshot:", error);
    sendServerError(res, error);
    return;
  }

  // Job erstellen
  try {
    const job = await createAudioProductionJob(
      "generate",
      {
        type: "generate",
        snapshot_id: snapshotId,
        project_id: projectId,
        scene_id: typeof sceneId === "string" ? sceneId : undefined,
        meta: {
          block_count: blocks.length,
          source: blockIds ? "block_ids" : sceneId ? "scene_id" : "script_id",
        },
      },
      bootstrap.user.id,
    );

    sendJson(res, 201, {
      job: {
        id: job.id,
        status: job.status,
        snapshot_id: snapshotId,
        block_count: blocks.length,
      },
    });
  } catch (error) {
    console.error("[Audio Production] Error creating job:", error);
    sendServerError(res, error);
  }
}

/**
 * POST /audio-production/preview
 * Input: { project_id, scene_id, track_ids[] }
 */
async function createPreview(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody<Record<string, unknown>>(req);
  const projectId = body.project_id;
  const sceneId = body.scene_id;
  const trackIds = Array.isArray(body.track_ids)
    ? (body.track_ids as string[])
    : undefined;

  if (!projectId || !sceneId) {
    sendBadRequest(res, "project_id and scene_id are required");
    return;
  }
  if (!(await canEditProject(bootstrap.user.id, projectId))) {
    sendUnauthorized(res);
    return;
  }

  // Leerer Snapshot für Preview — keine Script-Inhalte
  let snapshotId: string;
  try {
    const snapshot = await createSnapshot({
      project_id: projectId,
      scene_id: sceneId,
      block_references: [],
      snapshot_json: JSON.stringify({
        type: "preview",
        scene_id: sceneId,
        track_count: trackIds?.length || 0,
        track_ids: trackIds || [],
        generated_at: new Date().toISOString(),
      }),
      created_by: bootstrap.user.id,
    });
    snapshotId = snapshot.id;
  } catch (error) {
    console.error("[Audio Production] Error creating preview snapshot:", error);
    sendServerError(res, error);
    return;
  }

  try {
    const job = await createAudioProductionJob(
      "preview",
      {
        type: "preview",
        snapshot_id: snapshotId,
        project_id: projectId,
        scene_id: sceneId,
        track_ids: trackIds,
      },
      bootstrap.user.id,
    );

    sendJson(res, 201, {
      job: {
        id: job.id,
        status: job.status,
        snapshot_id: snapshotId,
      },
    });
  } catch (error) {
    console.error("[Audio Production] Error creating preview job:", error);
    sendServerError(res, error);
  }
}

/**
 * POST /audio-production/export
 * Input: { project_id, session_id | scene_id, format? }
 */
async function createExport(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody<Record<string, unknown>>(req);
  const projectId = body.project_id;
  const sessionId = body.session_id;
  const sceneId = body.scene_id;
  const format = typeof body.format === "string" ? body.format : "mp3";

  if (!projectId || (!sessionId && !sceneId)) {
    sendBadRequest(res, "project_id and (session_id or scene_id) are required");
    return;
  }
  if (!(await canEditProject(bootstrap.user.id, projectId))) {
    sendUnauthorized(res);
    return;
  }

  let snapshotId: string;
  try {
    const snapshot = await createSnapshot({
      project_id: projectId,
      scene_id: typeof sceneId === "string" ? sceneId : undefined,
      block_references: [],
      snapshot_json: JSON.stringify({
        type: "export",
        session_id: sessionId || null,
        scene_id: sceneId || null,
        format,
        generated_at: new Date().toISOString(),
      }),
      created_by: bootstrap.user.id,
    });
    snapshotId = snapshot.id;
  } catch (error) {
    console.error("[Audio Production] Error creating export snapshot:", error);
    sendServerError(res, error);
    return;
  }

  try {
    const job = await createAudioProductionJob(
      "export",
      {
        type: "export",
        snapshot_id: snapshotId,
        project_id: projectId,
        session_id: typeof sessionId === "string" ? sessionId : undefined,
        scene_id: typeof sceneId === "string" ? sceneId : undefined,
        format,
      },
      bootstrap.user.id,
    );

    sendJson(res, 201, {
      job: {
        id: job.id,
        status: job.status,
        snapshot_id: snapshotId,
        format,
      },
    });
  } catch (error) {
    console.error("[Audio Production] Error creating export job:", error);
    sendServerError(res, error);
  }
}

/**
 * GET /audio-production/jobs/:id
 */
async function getJob(
  req: RequestLike,
  res: ResponseLike,
  jobId: string,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const job = await getAudioProductionJob(jobId);
  if (!job) {
    sendNotFound(res, "Job not found");
    return;
  }

  // SOLID: Projekt-Zugriff pruefen — Job-Payload enthaelt project_id.
  if (!job.payload_json) {
    sendServerError(res, new Error("Job payload missing or invalid"));
    return;
  }

  try {
    const payload = JSON.parse(job.payload_json) as {
      project_id?: string;
    };
    if (
      payload.project_id &&
      !(await canReadProject(bootstrap.user.id, payload.project_id))
    ) {
      sendUnauthorized(res);
      return;
    }
  } catch {
    sendServerError(res, new Error("Job payload missing or invalid"));
    return;
  }

  sendJson(res, 200, { job });
}

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const pathname = (req.path || req.url || "/") as string;

  // POST /audio-production/generate
  if (req.method === "POST" && pathname.includes("/generate")) {
    await generateFromScript(req, res);
    return;
  }

  // POST /audio-production/preview
  if (req.method === "POST" && pathname.includes("/preview")) {
    await createPreview(req, res);
    return;
  }

  // POST /audio-production/export
  if (req.method === "POST" && pathname.includes("/export")) {
    await createExport(req, res);
    return;
  }

  // GET /audio-production/jobs/:id
  const jobMatch = pathname.match(/^\/audio-production\/jobs\/([\w-]+)$/);
  if (jobMatch && req.method === "GET") {
    await getJob(req, res, jobMatch[1]);
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST"]);
}
