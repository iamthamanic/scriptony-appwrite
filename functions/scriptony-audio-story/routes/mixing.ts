/**
 * Mixing & Export Routes — Audio Production Orchestration.
 *
 * T08 OBSOLETE: Alle Mixing/Export/Preview-Funktionalitaet ist jetzt in
 * `audio-production.ts` implementiert (POST /audio-production/preview,
 * POST /audio-production/export, GET /audio-production/jobs/:id).
 *
 * Diese Datei bleibt als Compatibility-Stub bis Frontend auf neue Routes
 * umgestellt ist. Alle Routen liefern 410 Gone.
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import { sendJson, sendMethodNotAllowed } from "../../_shared/http";

function gone(res: ResponseLike, route: string): void {
  sendJson(res, 410, {
    error: "Gone",
    message: `${route} wurde nach /audio-production verschoben (T08).`,
    new_routes: {
      preview: "POST /audio-production/preview",
      export: "POST /audio-production/export",
      status: "GET /audio-production/jobs/:id",
    },
  });
}

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const pathname = (req.path || req.url || "/") as string;

  if (req.method === "POST" && pathname.includes("/preview")) {
    gone(res, "POST /mixing/preview");
    return;
  }

  if (req.method === "POST" && pathname.includes("/export")) {
    gone(res, "POST /mixing/export");
    return;
  }

  const statusMatch = pathname.match(/^\/mixing\/status\/([\w-]+)$/);
  if (statusMatch && req.method === "GET") {
    gone(res, "GET /mixing/status/:jobId");
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST"]);
}
