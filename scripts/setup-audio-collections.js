#!/usr/bin/env node
/**
 * Setup script for Audio Story Collections (using fetch/REST API)
 * Run: APPWRITE_API_KEY=xxx node scripts/setup-audio-collections.js
 */

const ENDPOINT = process.env.APPWRITE_ENDPOINT || "http://localhost:8080/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "scriptony";
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = "scriptony";

if (!API_KEY) {
  console.error("❌ ERROR: APPWRITE_API_KEY environment variable required");
  console.log("Usage: APPWRITE_API_KEY=xxx node scripts/setup-audio-collections.js");
  process.exit(1);
}

async function appwriteFetch(path, method = "GET", body = null) {
  const url = `${ENDPOINT}${path}`;
  const headers = {
    "X-Appwrite-Project": PROJECT_ID,
    "X-Appwrite-Key": API_KEY,
    "Content-Type": "application/json",
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`HTTP ${res.status}: ${error}`);
  }
  return res.json();
}

async function createCollection(id, name) {
  console.log(`\n📁 Creating collection: ${name}...`);
  try {
    const collection = await appwriteFetch(
      `/databases/${DATABASE_ID}/collections`,
      "POST",
      {
        collectionId: id,
        name: name,
        documentSecurity: false,
        permissions: [],
      }
    );
    console.log(`✅ Collection created: ${collection.$id}`);
    return collection;
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log(`⚠️  Collection ${id} already exists, skipping...`);
      return { $id: id };
    }
    throw error;
  }
}

async function createStringAttribute(collectionId, key, size, required, def = null) {
  try {
    await appwriteFetch(
      `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/string`,
      "POST",
      { key, size, required, default: def, array: false }
    );
    console.log(`  ✅ String attribute: ${key}`);
  } catch (e) {
    console.log(`  ⚠️  Attribute ${key} may exist, skipping...`);
  }
}

async function createFloatAttribute(collectionId, key, required, def = 0) {
  try {
    await appwriteFetch(
      `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/float`,
      "POST",
      { key, required, default: def, min: 0, max: 999999 }
    );
    console.log(`  ✅ Float attribute: ${key}`);
  } catch (e) {
    console.log(`  ⚠️  Attribute ${key} may exist, skipping...`);
  }
}

async function createBooleanAttribute(collectionId, key, required, def = false) {
  try {
    await appwriteFetch(
      `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/boolean`,
      "POST",
      { key, required, default: def }
    );
    console.log(`  ✅ Boolean attribute: ${key}`);
  } catch (e) {
    console.log(`  ⚠️  Attribute ${key} may exist, skipping...`);
  }
}

async function setup() {
  console.log("🎵 Setting up Audio Story Collections...");
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Database: ${DATABASE_ID}\n`);

  // 1. Scene Audio Tracks
  await createCollection("scene_audio_tracks", "Scene Audio Tracks");
  await createStringAttribute("scene_audio_tracks", "scene_id", 255, true);
  await createStringAttribute("scene_audio_tracks", "project_id", 255, true);
  await createStringAttribute("scene_audio_tracks", "type", 20, true);
  await createStringAttribute("scene_audio_tracks", "content", 10000, false);
  await createStringAttribute("scene_audio_tracks", "character_id", 255, false);
  await createStringAttribute("scene_audio_tracks", "audio_file_id", 255, false);
  await createStringAttribute("scene_audio_tracks", "waveform_data", 100000, false);
  await createFloatAttribute("scene_audio_tracks", "audio_duration", false);
  await createFloatAttribute("scene_audio_tracks", "start_time", true, 0);
  await createFloatAttribute("scene_audio_tracks", "duration", true, 0);
  await createFloatAttribute("scene_audio_tracks", "fade_in", false, 0);
  await createFloatAttribute("scene_audio_tracks", "fade_out", false, 0);
  await createStringAttribute("scene_audio_tracks", "tts_voice_id", 100, false);
  await createStringAttribute("scene_audio_tracks", "tts_settings", 2000, false);
  await createBooleanAttribute("scene_audio_tracks", "tts_audio_generated", false, false);
  await createStringAttribute("scene_audio_tracks", "created_by", 255, false);
  await createStringAttribute("scene_audio_tracks", "updated_by", 255, false);

  // 2. Audio Sessions
  await createCollection("audio_sessions", "Audio Sessions");
  await createStringAttribute("audio_sessions", "project_id", 255, true);
  await createStringAttribute("audio_sessions", "scene_id", 255, true);
  await createStringAttribute("audio_sessions", "title", 255, true);
  await createStringAttribute("audio_sessions", "description", 5000, false);
  await createStringAttribute("audio_sessions", "status", 20, true);
  await createStringAttribute("audio_sessions", "recording_file_id", 255, false);
  await createFloatAttribute("audio_sessions", "recording_duration", false);
  await createStringAttribute("audio_sessions", "created_by", 255, true);
  await createStringAttribute("audio_sessions", "updated_by", 255, false);

  // 3. Audio Session Participants
  await createCollection("audio_session_participants", "Audio Session Participants");
  await createStringAttribute("audio_session_participants", "session_id", 255, true);
  await createStringAttribute("audio_session_participants", "character_id", 255, false);
  await createStringAttribute("audio_session_participants", "user_id", 255, false);
  await createStringAttribute("audio_session_participants", "external_speaker_name", 255, false);
  await createStringAttribute("audio_session_participants", "external_speaker_email", 255, false);
  await createStringAttribute("audio_session_participants", "role", 20, true);
  await createStringAttribute("audio_session_participants", "connection_id", 255, false);

  // 4. Character Voice Assignments
  await createCollection("character_voice_assignments", "Character Voice Assignments");
  await createStringAttribute("character_voice_assignments", "project_id", 255, true);
  await createStringAttribute("character_voice_assignments", "character_id", 255, true);
  await createStringAttribute("character_voice_assignments", "voice_actor_type", 20, true);
  await createStringAttribute("character_voice_assignments", "voice_actor_name", 255, false);
  await createStringAttribute("character_voice_assignments", "voice_actor_contact", 1000, false);
  await createStringAttribute("character_voice_assignments", "voice_actor_notes", 5000, false);
  await createStringAttribute("character_voice_assignments", "tts_provider", 50, false);
  await createStringAttribute("character_voice_assignments", "tts_voice_id", 100, false);
  await createStringAttribute("character_voice_assignments", "tts_voice_preset", 2000, false);
  await createStringAttribute("character_voice_assignments", "sample_audio_file_id", 255, false);
  await createStringAttribute("character_voice_assignments", "sample_text", 2000, false);

  console.log("\n✅ All Audio Story Collections created successfully!");
  console.log("\nCollections:");
  console.log("  - scene_audio_tracks");
  console.log("  - audio_sessions");
  console.log("  - audio_session_participants");
  console.log("  - character_voice_assignments");
}

setup().catch((error) => {
  console.error("\n❌ Setup failed:", error.message);
  process.exit(1);
});
