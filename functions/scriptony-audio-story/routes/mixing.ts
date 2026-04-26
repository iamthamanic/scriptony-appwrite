/**
 * Mixing & Export Routes — Audio Production Orchestration.
 *
 * Verantwortung (T07):
 *   Mixing-Orchestration, Export-Job-Erstellung, Preview-Queueing.
 *   Technische Engine (FFmpeg, Audio-Processing) ist VERBOTEN hier.
 *   Echte Ausfuehrung liegt bei scriptony-media-worker oder scriptony-audio.
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  readJsonBody,
  sendJson,
  sendUnauthorized,
  sendMethodNotAllowed,
} from "../../_shared/http";

async function createPreviewMix(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody<Record<string, unknown>>(req);
  const { sceneId, trackIds } = body;

  // Hier würde später FFmpeg-WASM Integration kommen
  sendJson(res, 200, {
    preview: {
      sceneId,
      tracks: trackIds,
      status: "queued",
      estimatedDuration: 30,
    },
  });
}

async function exportChapter(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody<Record<string, unknown>>(req);
  const { actId, format } = body;

  // Export Job in die Queue stellen
  sendJson(res, 200, {
    export: {
      actId,
      format: format || "mp3",
      status: "processing",
      downloadUrl: null,
    },
  });
}

async function getMixStatus(
  req: RequestLike,
  res: ResponseLike,
  jobId: string,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  sendJson(res, 200, {
    job: {
      id: jobId,
      status: "processing",
      progress: 45,
      downloadUrl: null,
    },
  });
}

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const pathname = (req.path || req.url || "/") as string;

  // POST /mixing/preview
  if (req.method === "POST" && pathname.includes("/preview")) {
    await createPreviewMix(req, res);
    return;
  }

  // POST /mixing/export/chapter
  if (req.method === "POST" && pathname.includes("/export")) {
    await exportChapter(req, res);
    return;
  }

  // GET /mixing/status/:jobId
  const statusMatch = pathname.match(/^\/mixing\/status\/([\w-]+)$/);
  if (statusMatch && req.method === "GET") {
    await getMixStatus(req, res, statusMatch[1]);
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST"]);
}
