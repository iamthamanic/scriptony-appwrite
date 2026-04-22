/**
 * POST /ai/gym/generate-starter — Creative Gym starter text (one-shot completion).
 * Uses the central ai-service chat() function with feature "creative_gym".
 * Location: functions/scriptony-assistant/ai/gym-generate-starter.ts
 */

import { chat } from "../../_shared/ai-service/services/text";
import { requireUserBootstrap } from "../../_shared/auth";
import { getCharactersByProject, getProjectById } from "../../_shared/timeline";
import { requireProjectAccess } from "../../_shared/scriptony";
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
import { CHALLENGE_SEEDS } from "../../../src/modules/creative-gym/infrastructure/seeds/challenge-seeds";

type GymMedium = "prose" | "screenplay" | "audio_drama" | "film_visual";

const gymRate = new Map<string, { n: number; windowStart: number }>();

function allowGymRate(
  userId: string,
  maxPerWindow = 40,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const e = gymRate.get(userId);
  if (!e || now - e.windowStart > windowMs) {
    gymRate.set(userId, { n: 1, windowStart: now });
    return true;
  }
  if (e.n >= maxPerWindow) return false;
  e.n += 1;
  return true;
}

function languageBlock(
  json: { output_language?: string; custom_locale?: string },
  uiLanguage?: string,
): string {
  const ol = json.output_language ?? "ui";
  if (ol === "de") return "Sprache: Deutsch.";
  if (ol === "en") return "Language: English.";
  if (ol === "custom" && json.custom_locale?.trim()) {
    return `Sprache / Locale: ${json.custom_locale.trim()}.`;
  }
  if (uiLanguage === "en") return "Language: English.";
  return "Sprache: Deutsch.";
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

    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    if (!allowGymRate(bootstrap.user.id)) {
      sendJson(res, 429, { error: "Zu viele Anfragen. Bitte kurz warten." });
      return;
    }

    const body = await readJsonBody<{
      challenge_template_id?: string;
      medium?: string;
      source_project_id?: string;
      regenerate?: boolean;
      ui_language?: string;
    }>(req);

    const challengeId = typeof body.challenge_template_id === "string"
      ? body.challenge_template_id.trim()
      : "";
    if (!challengeId) {
      sendBadRequest(res, "challenge_template_id is required");
      return;
    }

    const medium = (body.medium ?? "prose") as GymMedium;
    const validMedia: GymMedium[] = [
      "prose",
      "screenplay",
      "audio_drama",
      "film_visual",
    ];
    if (!validMedia.includes(medium)) {
      sendBadRequest(res, "invalid medium");
      return;
    }

    const tpl = CHALLENGE_SEEDS.find((c) => c.id === challengeId);
    if (!tpl) {
      sendBadRequest(res, "Unknown challenge_template_id");
      return;
    }

    const renderer = tpl.renderers[medium];
    if (!renderer) {
      sendBadRequest(res, "Challenge has no renderer for this medium");
      return;
    }

    let projectContext = "";
    const projectId = typeof body.source_project_id === "string"
      ? body.source_project_id.trim()
      : "";
    if (projectId) {
      const _project = await requireProjectAccess(
        projectId,
        bootstrap.user.id,
        res,
      );
      if (!_project) return;

      const p = await getProjectById(projectId);
      if (p) {
        const title = typeof p.title === "string" ? p.title : "";
        const logline = typeof (p as { logline?: string }).logline === "string"
          ? (p as { logline: string }).logline
          : "";
        const description =
          typeof (p as { description?: string }).description === "string"
            ? (p as { description: string }).description
            : "";
        const blurb = [logline, description]
          .filter(Boolean)
          .join("\n")
          .slice(0, 1500);
        projectContext =
          `\n\nProjekt-Kontext (optional nutzen):\nTitel: ${title}\nKurz: ${blurb}`;
      }

      const chars = await getCharactersByProject(projectId);
      const names = chars
        .map((c) => (typeof c.name === "string" ? c.name : ""))
        .filter(Boolean)
        .slice(0, 8);
      if (names.length) {
        projectContext += `\nFiguren (Namen): ${names.join(", ")}`;
      }
    }

    const lang = languageBlock({}, body.ui_language);

    const userPrompt = [
      `Challenge: ${tpl.title}`,
      `Beschreibung: ${tpl.description}`,
      `Medium: ${medium}`,
      lang,
      `Aufgabe für das Modell: Erzeuge EINEN kurzen Starter-Text für die Arbeitsfläche (Rohmaterial), passend zur Anweisung unten. Keine Meta-Kommentare, nur der Text.`,
      `Anweisung (${medium}): ${renderer.instruction}`,
      `Regeln: ${renderer.rules.join(" ")}`,
      `Format-Hinweis: ${renderer.suggestedOutputFormat}`,
      projectContext,
      body.regenerate ? "\n(Variante: neu und anders als zuvor möglich.)" : "",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await chat(
      bootstrap.user.id,
      [{ role: "user", content: userPrompt }],
      "creative_gym",
      {
        temperature: 0.8,
      },
    );

    sendJson(res, 200, {
      text: result.content,
      challenge_template_id: challengeId,
      medium,
      token_details: {
        input_tokens: result.usage?.promptTokens ?? 0,
        output_tokens: result.usage?.completionTokens ?? 0,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
