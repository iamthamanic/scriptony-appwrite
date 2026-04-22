/**
 * Recording Sessions API
 * Multi-User Recording (WebRTC Signaling Preparation)
 */

import { Hono } from "hono";
import { requestGraphql } from "../../_shared/graphql-compat.ts";

const app = new Hono();

// GET /sessions/:sceneId - Sessions für eine Szene
app.get("/scene/:sceneId", async (c) => {
  const sceneId = c.req.param("sceneId");
  const _user = c.get("user");

  try {
    const data = await requestGraphql<{
      audio_sessions: Array<Record<string, unknown>>;
    }>(
      `
      query GetAudioSessions($sceneId: uuid!) {
        audio_sessions(
          where: { scene_id: { _eq: $sceneId } }
          order_by: { created_at: desc }
        ) {
          id
          scene_id
          title
          status
          participants {
            id
            character_id
            user_id
            role
          }
          started_at
          ended_at
          recording_url
          created_at
        }
      }
    `,
      { sceneId },
    );

    return c.json({ sessions: data.audio_sessions });
  } catch (error) {
    console.error("[Audio Story] Error fetching sessions:", error);
    return c.json({ error: "Failed to fetch sessions" }, 500);
  }
});

// POST /sessions - Neue Session erstellen
app.post("/", async (c) => {
  const body = await c.req.json();
  const _user = c.get("user");

  const { sceneId, title, _participantIds } = body;

  if (!sceneId || !title) {
    return c.json({ error: "sceneId and title required" }, 400);
  }

  try {
    const data = await requestGraphql<{
      insert_audio_sessions_one: Record<string, unknown>;
    }>(
      `
      mutation CreateAudioSession($object: audio_sessions_insert_input!) {
        insert_audio_sessions_one(object: $object) {
          id
          scene_id
          title
          status
          created_at
        }
      }
    `,
      {
        object: {
          scene_id: sceneId,
          title,
          created_by: _user.id,
          status: "preparing",
        },
      },
    );

    return c.json({ session: data.insert_audio_sessions_one }, 201);
  } catch (error) {
    console.error("[Audio Story] Error creating session:", error);
    return c.json({ error: "Failed to create session" }, 500);
  }
});

export default app;
