/**
 * Audio Tracks API
 * Verwaltung von Audio-Tracks pro Szene (Dialog, Music, SFX)
 */

import { Hono } from "hono";
import { requestGraphql } from "../../_shared/graphql-compat.ts";

const app = new Hono();

// GET /tracks/scene/:sceneId - Alle Tracks einer Szene
app.get("/scene/:sceneId", async (c) => {
  const sceneId = c.req.param("sceneId");

  try {
    const data = await requestGraphql<{
      scene_audio_tracks: Array<Record<string, unknown>>;
    }>(
      `
      query GetAudioTracks($sceneId: uuid!) {
        scene_audio_tracks(
          where: { scene_id: { _eq: $sceneId } }
          order_by: { start_time: asc }
        ) {
          id
          scene_id
          type
          content
          character_id
          audio_file_id
          waveform_data
          start_time
          duration
          fade_in
          fade_out
          created_at
        }
      }
    `,
      { sceneId },
    );

    return c.json({ tracks: data.scene_audio_tracks });
  } catch (error) {
    console.error("[Audio Story] Error fetching tracks:", error);
    return c.json({ error: "Failed to fetch tracks" }, 500);
  }
});

// POST /tracks - Neuen Track erstellen
app.post("/", async (c) => {
  const body = await c.req.json();
  const user = c.get("user");

  const { sceneId, type, content, characterId, startTime, duration } = body;

  if (!sceneId || !type) {
    return c.json({ error: "sceneId and type required" }, 400);
  }

  try {
    const data = await requestGraphql<{
      insert_scene_audio_tracks_one: Record<string, unknown>;
    }>(
      `
      mutation CreateAudioTrack($object: scene_audio_tracks_insert_input!) {
        insert_scene_audio_tracks_one(object: $object) {
          id
          scene_id
          type
          content
          character_id
          start_time
          duration
          created_at
        }
      }
    `,
      {
        object: {
          scene_id: sceneId,
          type, // 'dialog', 'narrator', 'music', 'sfx', 'atmo'
          content: content || null,
          character_id: characterId || null,
          start_time: startTime || 0,
          duration: duration || 0,
          created_by: user.id,
        },
      },
    );

    return c.json({ track: data.insert_scene_audio_tracks_one }, 201);
  } catch (error) {
    console.error("[Audio Story] Error creating track:", error);
    return c.json({ error: "Failed to create track" }, 500);
  }
});

// PUT /tracks/:id - Track aktualisieren
app.put("/:id", async (c) => {
  const trackId = c.req.param("id");
  const body = await c.req.json();

  try {
    const data = await requestGraphql<{
      update_scene_audio_tracks_by_pk: Record<string, unknown>;
    }>(
      `
      mutation UpdateAudioTrack($id: uuid!, $set: scene_audio_tracks_set_input!) {
        update_scene_audio_tracks_by_pk(pk_columns: { id: $id }, _set: $set) {
          id
          type
          content
          character_id
          start_time
          duration
          updated_at
        }
      }
    `,
      { id: trackId, set: body },
    );

    return c.json({ track: data.update_scene_audio_tracks_by_pk });
  } catch (error) {
    console.error("[Audio Story] Error updating track:", error);
    return c.json({ error: "Failed to update track" }, 500);
  }
});

// DELETE /tracks/:id
app.delete("/:id", async (c) => {
  const trackId = c.req.param("id");

  try {
    await requestGraphql(
      `
      mutation DeleteAudioTrack($id: uuid!) {
        delete_scene_audio_tracks_by_pk(id: $id) {
          id
        }
      }
    `,
      { id: trackId },
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("[Audio Story] Error deleting track:", error);
    return c.json({ error: "Failed to delete track" }, 500);
  }
});

export default app;
