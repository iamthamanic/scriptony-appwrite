#!/usr/bin/env node
/**
 * Setup script for Audio Story Collections
 * Run: node scripts/setup-audio-collections.js
 */

const { Client, Databases, ID } = require("node-appwrite");

const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "http://localhost:8080/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID || "scriptony")
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = "scriptony-dev";

async function createCollection(id, name, attributes, indexes = []) {
  try {
    console.log(`Creating collection: ${name}...`);
    const collection = await databases.createCollection(
      DATABASE_ID,
      id,
      name,
      [],
      [],
      true,
      true
    );

    for (const attr of attributes) {
      console.log(`  - Adding attribute: ${attr.key}`);
      switch (attr.type) {
        case "string":
          await databases.createStringAttribute(
            DATABASE_ID,
            id,
            attr.key,
            attr.size || 255,
            attr.required,
            attr.default,
            attr.array
          );
          break;
        case "double":
          await databases.createFloatAttribute(
            DATABASE_ID,
            id,
            attr.key,
            attr.required,
            attr.default,
            attr.min,
            attr.max
          );
          break;
        case "boolean":
          await databases.createBooleanAttribute(
            DATABASE_ID,
            id,
            attr.key,
            attr.required,
            attr.default
          );
          break;
        case "datetime":
          await databases.createDatetimeAttribute(
            DATABASE_ID,
            id,
            attr.key,
            attr.required,
            attr.default
          );
          break;
      }
    }

    console.log(`✅ Collection ${name} created successfully!`);
    return collection;
  } catch (error) {
    console.error(`❌ Error creating ${name}:`, error.message);
    throw error;
  }
}

async function setup() {
  console.log("🎵 Setting up Audio Story Collections...\n");

  // Scene Audio Tracks
  await createCollection(
    "scene_audio_tracks",
    "Scene Audio Tracks",
    [
      { key: "scene_id", type: "string", required: true, size: 255 },
      { key: "project_id", type: "string", required: true, size: 255 },
      { key: "type", type: "string", required: true, size: 20 },
      { key: "content", type: "string", required: false, size: 10000 },
      { key: "character_id", type: "string", required: false, size: 255 },
      { key: "audio_file_id", type: "string", required: false, size: 255 },
      { key: "waveform_data", type: "string", required: false, size: 100000 },
      { key: "audio_duration", type: "double", required: false },
      { key: "start_time", type: "double", required: true, default: 0 },
      { key: "duration", type: "double", required: true, default: 0 },
      { key: "fade_in", type: "double", required: false, default: 0 },
      { key: "fade_out", type: "double", required: false, default: 0 },
      { key: "tts_voice_id", type: "string", required: false, size: 100 },
      { key: "tts_settings", type: "string", required: false, size: 2000 },
      { key: "tts_audio_generated", type: "boolean", required: false, default: false },
      { key: "created_by", type: "string", required: false, size: 255 },
      { key: "updated_by", type: "string", required: false, size: 255 },
      { key: "created_at", type: "datetime", required: true },
      { key: "updated_at", type: "datetime", required: true },
    ]
  );

  // Audio Sessions
  await createCollection(
    "audio_sessions",
    "Audio Sessions",
    [
      { key: "project_id", type: "string", required: true, size: 255 },
      { key: "scene_id", type: "string", required: true, size: 255 },
      { key: "title", type: "string", required: true, size: 255 },
      { key: "description", type: "string", required: false, size: 5000 },
      { key: "status", type: "string", required: true, size: 20 },
      { key: "started_at", type: "datetime", required: false },
      { key: "ended_at", type: "datetime", required: false },
      { key: "recording_file_id", type: "string", required: false, size: 255 },
      { key: "recording_duration", type: "double", required: false },
      { key: "created_by", type: "string", required: true, size: 255 },
      { key: "updated_by", type: "string", required: false, size: 255 },
      { key: "created_at", type: "datetime", required: true },
      { key: "updated_at", type: "datetime", required: true },
    ]
  );

  // Audio Session Participants
  await createCollection(
    "audio_session_participants",
    "Audio Session Participants",
    [
      { key: "session_id", type: "string", required: true, size: 255 },
      { key: "character_id", type: "string", required: false, size: 255 },
      { key: "user_id", type: "string", required: false, size: 255 },
      { key: "external_speaker_name", type: "string", required: false, size: 255 },
      { key: "external_speaker_email", type: "string", required: false, size: 255 },
      { key: "role", type: "string", required: true, size: 20 },
      { key: "connection_id", type: "string", required: false, size: 255 },
      { key: "joined_at", type: "datetime", required: false },
      { key: "left_at", type: "datetime", required: false },
      { key: "created_at", type: "datetime", required: true },
    ]
  );

  // Character Voice Assignments
  await createCollection(
    "character_voice_assignments",
    "Character Voice Assignments",
    [
      { key: "project_id", type: "string", required: true, size: 255 },
      { key: "character_id", type: "string", required: true, size: 255 },
      { key: "voice_actor_type", type: "string", required: true, size: 20 },
      { key: "voice_actor_name", type: "string", required: false, size: 255 },
      { key: "voice_actor_contact", type: "string", required: false, size: 1000 },
      { key: "voice_actor_notes", type: "string", required: false, size: 5000 },
      { key: "tts_provider", type: "string", required: false, size: 50 },
      { key: "tts_voice_id", type: "string", required: false, size: 100 },
      { key: "tts_voice_preset", type: "string", required: false, size: 2000 },
      { key: "sample_audio_file_id", type: "string", required: false, size: 255 },
      { key: "sample_text", type: "string", required: false, size: 2000 },
      { key: "created_by", type: "string", required: false, size: 255 },
      { key: "updated_by", type: "string", required: false, size: 255 },
      { key: "created_at", type: "datetime", required: true },
      { key: "updated_at", type: "datetime", required: true },
    ]
  );

  console.log("\n✅ All Audio Story Collections created successfully!");
}

setup().catch((error) => {
  console.error("Setup failed:", error);
  process.exit(1);
});
