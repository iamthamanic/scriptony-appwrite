/**
 * Generates a project cover image using the central ai-service.
 * Resolves provider/key/model from per-user feature config and delegates
 * to the shared generateImage() service function.
 *
 * T10: Technische Bildoperation — bleibt in scriptony-image.
 * Die fachliche Zuordnung zum Projekt (Cover) erfolgt durch den Aufrufer.
 */

import { generateImage } from "../../_shared/ai-service/services/image";
import { requireAuthenticatedUser } from "../../_shared/auth";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) {
      sendUnauthorized(res);
      return;
    }
    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const body = await readJsonBody<{ prompt?: string; projectId?: string }>(
      req,
    );
    const prompt = body.prompt?.trim() || "";
    if (!prompt) {
      sendBadRequest(res, "prompt is required");
      return;
    }

    const imageResponse = await generateImage(user.id, prompt, {
      size: "1024x1792",
    });

    // Prefer b64Json (Ollama local/cloud), fall back to url (OpenRouter)
    const b64 = imageResponse.b64Json || "";
    const url = imageResponse.url || "";

    if (!b64 && !url) {
      sendJson(res, 502, {
        error:
          "Provider-Antwort enthält kein Bild (erwartet b64_json oder url).",
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      project_id: body.projectId || null,
      mime_type: "image/png",
      image_base64: b64,
      image_url: url || undefined,
    });
  } catch (error) {
    // Distinguish known provider errors from unexpected ones
    const message = error instanceof Error ? error.message : String(error);
    if (/does not support image generation/i.test(message)) {
      sendJson(res, 400, { error: `Konfiguration: ${message}` });
      return;
    }
    if (/no.*api.key|key.*required|key.*missing/i.test(message)) {
      sendJson(res, 400, {
        error: "Kein API-Key für die Bildgenerierung hinterlegt.",
      });
      return;
    }
    sendServerError(res, error);
  }
}
