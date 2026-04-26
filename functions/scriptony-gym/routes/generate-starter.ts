/**
 * POST /generate-starter — Creative Gym starter text (one-shot completion).
 *
 * T11: Von scriptony-assistant hierher migriert.
 * Nutze POST /generate-starter bei scriptony-gym.
 */

import { type Context } from "hono";
import { chat } from "../../_shared/ai-service/services/text";
import { requireAuthenticatedUser } from "../../_shared/auth";
import { getCharactersByProject, getProjectById } from "../../_shared/timeline";
import {
  getAccessibleProject,
  getUserOrganizationIds,
} from "../../_shared/scriptony";
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
  _json: { output_language?: string; custom_locale?: string },
  uiLanguage?: string,
): string {
  if (uiLanguage === "en") return "Language: English.";
  return "Sprache: Deutsch.";
}

export default async function handleGenerateStarter(
  c: Context,
): Promise<Response> {
  try {
    const authHeader = c.req.header("Authorization");
    const user = await requireAuthenticatedUser(authHeader);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (!allowGymRate(user.id)) {
      return c.json({ error: "Zu viele Anfragen. Bitte kurz warten." }, 429);
    }

    const body = await c.req.json<{
      challenge_template_id?: string;
      medium?: string;
      source_project_id?: string;
      regenerate?: boolean;
      ui_language?: string;
    }>();

    const challengeId =
      typeof body.challenge_template_id === "string"
        ? body.challenge_template_id.trim()
        : "";
    if (!challengeId) {
      return c.json({ error: "challenge_template_id is required" }, 400);
    }

    const medium = (body.medium ?? "prose") as GymMedium;
    const validMedia: GymMedium[] = [
      "prose",
      "screenplay",
      "audio_drama",
      "film_visual",
    ];
    if (!validMedia.includes(medium)) {
      return c.json({ error: "invalid medium" }, 400);
    }

    const tpl = CHALLENGE_SEEDS.find((c) => c.id === challengeId);
    if (!tpl) {
      return c.json({ error: "Unknown challenge_template_id" }, 400);
    }

    const renderer = tpl.renderers[medium];
    if (!renderer) {
      return c.json(
        { error: "Challenge has no renderer for this medium" },
        400,
      );
    }

    const organizationIds = await getUserOrganizationIds(user.id);

    let projectContext = "";
    const projectId =
      typeof body.source_project_id === "string"
        ? body.source_project_id.trim()
        : "";
    if (projectId) {
      const project = await getAccessibleProject(
        projectId,
        user.id,
        organizationIds,
      );
      if (!project) {
        return c.json({ error: "Project not found" }, 404);
      }

      const p = await getProjectById(projectId);
      if (p) {
        const title = typeof p.title === "string" ? p.title : "";
        const logline =
          typeof (p as { logline?: string }).logline === "string"
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
        projectContext = `\n\nProjekt-Kontext (optional nutzen):\nTitel: ${title}\nKurz: ${blurb}`;
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
      user.id,
      [{ role: "user", content: userPrompt }],
      "creative_gym",
      {
        temperature: 0.8,
      },
    );

    return c.json({
      text: result.content,
      challenge_template_id: challengeId,
      medium,
      token_details: {
        input_tokens: result.usage?.promptTokens ?? 0,
        output_tokens: result.usage?.completionTokens ?? 0,
      },
    });
  } catch (error) {
    console.error("[Gym Generate Starter] Error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Server error" },
      500,
    );
  }
}
