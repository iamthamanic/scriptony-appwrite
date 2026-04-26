/**
 * Mixing & Export Routes — Audio Production Orchestration.
 *
 * Verantwortung (T07):
 *   Mixing-Orchestration, Export-Job-Erstellung, Preview-Queueing.
 *   Technische Engine (FFmpeg, Audio-Processing) ist VERBOTEN hier.
 *   Echte Ausfuehrung liegt bei scriptony-media-worker oder scriptony-audio.
 *
 * T08 Implementiert:
 *   Preview-Mix und Export erzeugen jobs-Eintraege und delegieren
 *   an scriptony-media-worker. Aktuell: 501 Not Implemented —
 *   Orchestration-API-Contract definiert, Engine fehlt.
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  readJsonBody,
  sendJson,
  sendUnauthorized,
  sendMethodNotAllowed,
} from "../../_shared/http";

function notImplemented(res: ResponseLike, feature: string): void {
  sendJson(res, 501, {
    error: "Not Implemented",
    message: `${feature} is planned for T08 (Audio Production Orchestration). Use a local audio tool until then.`,
  });
}

async function createPreviewMix(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  // T08: Job erstellen und an scriptony-media-worker delegieren.
  notImplemented(res, "Preview Mix (T08)");
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

  // T08: Export-Job erstellen und an scriptony-media-worker delegieren.
  notImplemented(res, "Export Chapter (T08)");
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

  // T08: Job-Status aus jobs-Collection lesen.
  notImplemented(res, "Mix Status (T08)");
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
