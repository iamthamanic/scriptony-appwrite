/**
 * Voice Casting API
 * Charakter-Sprecher-Zuordnung (Human oder TTS)
 */

import { Hono } from "hono";
import { requestGraphql } from "../../_shared/graphql-compat.ts";

const app = new Hono();

// GET /voices/project/:projectId - Alle Voice-Assignments
app.get("/project/:projectId", async (c) => {
  const projectId = c.req.param("projectId");

  try {
    const data = await requestGraphql<{
      character_voice_assignments: Array<Record<string, unknown>>;
    }>(
      `
      query GetVoiceAssignments($projectId: uuid!) {
        character_voice_assignments(
          where: { project_id: { _eq: $projectId } }
        ) {
          id
          project_id
          character_id
          voice_actor_type
          voice_actor_name
          voice_actor_contact
          tts_voice_preset
          created_at
          character {
            id
            name
            avatar_url
          }
        }
      }
    `,
      { projectId },
    );

    return c.json({ assignments: data.character_voice_assignments });
  } catch (error) {
    console.error("[Audio Story] Error fetching voices:", error);
    return c.json({ error: "Failed to fetch voice assignments" }, 500);
  }
});

// POST /voices/assign - Voice zuweisen
app.post("/assign", async (c) => {
  const body = await c.req.json();
  const {
    projectId,
    characterId,
    voiceActorType,
    voiceActorName,
    ttsVoicePreset,
  } = body;

  if (!projectId || !characterId || !voiceActorType) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  try {
    const data = await requestGraphql<{
      insert_character_voice_assignments_one: Record<string, unknown>;
    }>(
      `
      mutation AssignVoice($object: character_voice_assignments_insert_input!) {
        insert_character_voice_assignments_one(object: $object) {
          id
          character_id
          voice_actor_type
          voice_actor_name
          tts_voice_preset
        }
      }
    `,
      {
        object: {
          project_id: projectId,
          character_id: characterId,
          voice_actor_type: voiceActorType, // 'human' oder 'tts'
          voice_actor_name: voiceActorName || null,
          tts_voice_preset: ttsVoicePreset || null,
        },
      },
    );

    return c.json(
      { assignment: data.insert_character_voice_assignments_one },
      201,
    );
  } catch (error) {
    console.error("[Audio Story] Error assigning voice:", error);
    return c.json({ error: "Failed to assign voice" }, 500);
  }
});

// GET /voices/tts/voices - Verfügbare TTS-Stimmen
app.get("/tts/voices", (c) => {
  // In Zukunft könnte hier externe API (ElevenLabs, OpenAI) abgefragt werden
  return c.json({
    ttsVoices: [
      {
        id: "alloy",
        name: "Alloy",
        provider: "openai",
        language: "multilingual",
      },
      {
        id: "echo",
        name: "Echo",
        provider: "openai",
        language: "multilingual",
      },
      {
        id: "fable",
        name: "Fable",
        provider: "openai",
        language: "multilingual",
      },
      {
        id: "onyx",
        name: "Onyx",
        provider: "openai",
        language: "multilingual",
      },
      {
        id: "nova",
        name: "Nova",
        provider: "openai",
        language: "multilingual",
      },
      {
        id: "shimmer",
        name: "Shimmer",
        provider: "openai",
        language: "multilingual",
      },
    ],
  });
});

export default app;
