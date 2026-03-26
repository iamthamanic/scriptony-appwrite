#!/usr/bin/env node
/**
 * Idempotent Appwrite Databases (legacy) provisioning for Scriptony:
 * ensures database `scriptony`, all collections from `functions/_shared/appwrite-db.ts`,
 * string/integer/boolean/datetime/email/url attributes, and basic key indexes for filtered fields.
 *
 * Run from repo: npm run appwrite:provision:schema
 * Requires env: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY
 * Optional: APPWRITE_DATABASE_ID (default scriptony)
 *
 * Appwrite / MariaDB: many "short" string attributes (max length ≤ 16384) share a small
 * per-document budget; exceeding it yields attribute_limit_exceeded. Long text uses L()/XL()
 * with size ≥ 16385 so it is stored as large text (see appwrite/appwrite discussions/4562).
 * Collections provisioned with older L() sizes may need attributes deleted or the collection
 * recreated, then re-run this script.
 *
 * Location: functions/tools/provision-appwrite-schema.mjs
 */

import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getAppwriteToolCredentials } from "./_appwrite-tool-creds.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const functionsRoot = join(__dirname, "..");
const require = createRequire(join(functionsRoot, "package.json"));
const { Client, Databases, IndexType, OrderBy } = require("node-appwrite");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { endpoint, projectId, apiKey, databaseId } = getAppwriteToolCredentials(
  " Your .env*.local has APPWRITE_API_KEY= with no value after = — paste the key from Appwrite Console → Your project → API keys."
);

/** Below this max length, string attrs count toward MariaDB's tight inline row budget. */
const APPWRITE_LONG_STRING_MIN = 16385;

const S = (size = 512) => ({ kind: "string", size, required: false });
const L = (size = 16000) => ({
  kind: "string",
  size: Math.max(size, APPWRITE_LONG_STRING_MIN),
  required: false,
});
const XL = (size = 50000) => ({
  kind: "string",
  size: Math.max(size, APPWRITE_LONG_STRING_MIN),
  required: false,
});
const I = () => ({ kind: "integer", required: false });
const B = () => ({ kind: "boolean", required: false });
const D = () => ({ kind: "datetime", required: false });
const E = () => ({ kind: "email", required: false });
const U = () => ({ kind: "url", required: false });
const F = () => ({ kind: "float", required: false });

/** @type {Record<string, Record<string, object>>} */
const SCHEMA = {
  projects: {
    organization_id: S(64),
    user_id: S(64),
    title: S(1024),
    type: S(128),
    logline: L(8000),
    genre: L(4000),
    duration: S(128),
    world_id: S(64),
    cover_image_url: U(),
    is_deleted: B(),
    narrative_structure: S(512),
    beat_template: S(512),
    episode_layout: S(512),
    season_engine: S(512),
    concept_blocks: XL(50000),
    description: L(8000),
    status: S(128),
    slug: S(256),
    template_id: S(128),
    format: S(128),
  },
  organizations: {
    name: S(512),
    slug: S(256),
    owner_user_id: S(64),
    description: L(4000),
    logo_url: U(),
    plan: S(64),
    settings_json: XL(32000),
  },
  organization_members: {
    organization_id: S(64),
    user_id: S(64),
    role: S(128),
  },
  users: {
    email: E(),
    display_name: S(512),
    avatar_url: U(),
    bio: L(8000),
    settings_json: XL(32000),
  },
  worlds: {
    id: S(64),
    organization_id: S(64),
    name: S(512),
    description: L(8000),
    cover_image_url: U(),
    linked_project_id: S(64),
    template_id: S(128),
  },
  world_categories: {
    world_id: S(64),
    name: S(512),
    order_index: I(),
    color: S(64),
    icon: S(128),
  },
  world_items: {
    world_id: S(64),
    category_id: S(64),
    title: S(1024),
    body: XL(32000),
    order_index: I(),
    kind: S(64),
  },
  timeline_nodes: {
    project_id: S(64),
    parent_id: S(64),
    level: I(),
    order_index: I(),
    title: S(1024),
    node_type: S(128),
    scene_id: S(64),
    template_id: S(128),
    metadata_json: XL(32000),
    summary: L(8000),
  },
  shots: {
    project_id: S(64),
    scene_id: S(64),
    order_index: I(),
    title: S(1024),
    // Legacy compatibility for older handlers/UI payloads.
    shot_number: S(128),
    description: L(8000),
    duration: S(128),
    camera_angle: S(128),
    camera_movement: S(128),
    framing: S(128),
    lens: S(128),
    shotlength_minutes: I(),
    shotlength_seconds: I(),
    composition: L(4000),
    lighting_notes: L(8000),
    image_url: U(),
    sound_notes: L(8000),
    storyboard_url: U(),
    reference_image_url: U(),
    user_id: S(64),
    dialogue: XL(32000),
    // Legacy payload key still sent by some clients.
    dialog: XL(32000),
    notes: XL(32000),
  },
  shot_audio: {
    shot_id: S(64),
    file_name: S(1024),
    file_size: I(),
    bucket_file_id: S(128),
    mime_type: S(128),
    duration_ms: I(),
    user_id: S(64),
    storage_path: S(2048),
  },
  shot_characters: {
    shot_id: S(64),
    character_id: S(64),
  },
  characters: {
    project_id: S(64),
    world_id: S(64),
    organization_id: S(64),
    name: S(512),
    description: L(8000),
    role: S(256),
    color: S(64),
    avatar_url: U(),
    traits_json: XL(32000),
  },
  scenes: {
    project_id: S(64),
    name: S(512),
    order_index: I(),
    summary: L(4000),
  },
  story_beats: {
    project_id: S(64),
    user_id: S(64),
    order_index: I(),
    title: S(1024),
    beat_type: S(128),
    content: XL(32000),
    // Legacy payload key still sent by some clients.
    description: XL(32000),
    parent_beat_id: S(64),
    // Legacy compatibility fields still referenced by frontend payloads.
    label: S(1024),
    template_abbr: S(128),
    from_container_id: S(64),
    to_container_id: S(64),
    pct_from: F(),
    pct_to: F(),
    color: S(64),
    notes: XL(32000),
  },
  activity_logs: {
    project_id: S(64),
    user_id: S(64),
    entity_type: S(128),
    entity_id: S(64),
    action: S(256),
    payload_json: XL(32000),
    created_at: D(),
  },
  ai_chat_settings: {
    user_id: S(64),
    provider: S(128),
    model: S(256),
    settings_json: XL(32000),
    temperature: F(),
    system_prompt_default: XL(32000),
  },
  ai_conversations: {
    user_id: S(64),
    title: S(1024),
    last_message_at: D(),
    message_count: I(),
    system_prompt: XL(32000),
    archived: B(),
  },
  ai_chat_messages: {
    conversation_id: S(64),
    role: S(64),
    content: XL(50000),
    created_at: D(),
    metadata_json: L(16000),
  },
  rag_sync_queue: {
    user_id: S(64),
    project_id: S(64),
    status: S(64),
    payload_json: XL(32000),
    error: L(8000),
    attempts: I(),
  },
  user_integration_tokens: {
    user_id: S(64),
    token_hash: S(256),
    name: S(256),
    provider: S(128),
    expires_at: D(),
    last_used_at: D(),
  },
  project_inspirations: {
    project_id: S(64),
    title: S(1024),
    body: XL(32000),
    source_url: U(),
    image_url: U(),
    order_index: I(),
    kind: S(64),
  },
};

/** Single-field key indexes for common Query.equal / order fields */
const INDEXES = {
  projects: ["organization_id", "user_id", "world_id"],
  organization_members: ["organization_id", "user_id"],
  worlds: ["organization_id", "linked_project_id", "id"],
  world_categories: ["world_id"],
  world_items: ["world_id"],
  timeline_nodes: ["project_id", "parent_id", "scene_id"],
  shots: ["project_id", "scene_id", "user_id"],
  shot_audio: ["shot_id"],
  shot_characters: ["shot_id", "character_id"],
  characters: ["project_id", "world_id", "organization_id"],
  scenes: ["project_id"],
  story_beats: ["project_id", "user_id"],
  activity_logs: ["project_id", "entity_type", "entity_id"],
  ai_chat_settings: ["user_id"],
  ai_conversations: ["user_id"],
  ai_chat_messages: ["conversation_id"],
  rag_sync_queue: ["project_id", "user_id", "status"],
  user_integration_tokens: ["user_id", "token_hash"],
  project_inspirations: ["project_id"],
};

async function waitAttribute(db, collectionId, key) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const a = await db.getAttribute(databaseId, collectionId, key);
    if (a.status === "available") return;
    if (a.status === "failed") throw new Error(`Attribute ${collectionId}.${key} failed: ${JSON.stringify(a)}`);
    await sleep(400);
  }
  throw new Error(`Timeout waiting for attribute ${collectionId}.${key}`);
}

function isConflict(err) {
  return err?.code === 409 || String(err?.message || "").toLowerCase().includes("already exists");
}

function isAttributeLimitExceeded(err) {
  return (
    err?.type === "attribute_limit_exceeded" ||
    (err?.code === 400 &&
      String(err?.message || "").toLowerCase().includes("maximum number or size of attributes"))
  );
}

async function ensureDatabase(db) {
  try {
    await db.get(databaseId);
    console.log(`database ok: ${databaseId}`);
  } catch (e) {
    if (e?.code === 404) {
      await db.create(databaseId, "Scriptony", true);
      console.log(`database created: ${databaseId}`);
    } else throw e;
  }
}

async function ensureCollection(db, collectionId) {
  try {
    await db.getCollection(databaseId, collectionId);
    console.log(`  collection exists: ${collectionId}`);
  } catch (e) {
    if (e?.code === 404) {
      await db.createCollection(databaseId, collectionId, collectionId, [], false, true);
      console.log(`  collection created: ${collectionId}`);
    } else throw e;
  }
}

async function ensureAttribute(db, collectionId, key, spec) {
  const { attributes: existingAttrs } = await db.listAttributes(databaseId, collectionId);
  if (existingAttrs.some((a) => a.key === key)) {
    console.log(`    attr skip (exists): ${key}`);
    return;
  }
  const { kind, required = false } = spec;
  try {
    if (kind === "string") {
      await db.createStringAttribute(databaseId, collectionId, key, spec.size, required);
    } else if (kind === "integer") {
      await db.createIntegerAttribute(databaseId, collectionId, key, required);
    } else if (kind === "boolean") {
      await db.createBooleanAttribute(databaseId, collectionId, key, required);
    } else if (kind === "datetime") {
      await db.createDatetimeAttribute(databaseId, collectionId, key, required);
    } else if (kind === "email") {
      await db.createEmailAttribute(databaseId, collectionId, key, required);
    } else if (kind === "url") {
      await db.createUrlAttribute(databaseId, collectionId, key, required);
    } else if (kind === "float") {
      await db.createFloatAttribute(databaseId, collectionId, key, required);
    } else {
      throw new Error(`Unknown kind ${kind} for ${collectionId}.${key}`);
    }
    await waitAttribute(db, collectionId, key);
    console.log(`    attr ok: ${key} (${kind})`);
  } catch (e) {
    if (isConflict(e)) {
      console.log(`    attr skip (conflict): ${key}`);
      return;
    }
    if (isAttributeLimitExceeded(e)) {
      console.error(
        `\n[provision] attribute_limit_exceeded at ${collectionId}.${key}: ` +
          "Too many short string/URL columns in this collection for MariaDB’s row budget. " +
          "This script now provisions L()/XL() with min size 16385. If this collection was created earlier, " +
          "delete the collection in Appwrite Console (or remove its long text attributes) and run provision again.\n"
      );
    }
    throw e;
  }
}

async function ensureIndex(db, collectionId, field) {
  const idxKey = `idx_${field}`;
  try {
    const { indexes } = await db.listIndexes(databaseId, collectionId);
    if (indexes.some((i) => i.key === idxKey)) {
      console.log(`    index skip: ${idxKey}`);
      return;
    }
    await db.createIndex(databaseId, collectionId, idxKey, IndexType.Key, [field], [OrderBy.Asc]);
    console.log(`    index ok: ${idxKey}`);
  } catch (e) {
    if (isConflict(e)) console.log(`    index skip (conflict): idx_${field}`);
    else throw e;
  }
}

async function main() {
  console.log(`Endpoint ${endpoint}  project ${projectId}  database ${databaseId}`);

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const db = new Databases(client);

  await ensureDatabase(db);

  for (const [collectionId, attrs] of Object.entries(SCHEMA)) {
    await ensureCollection(db, collectionId);
    for (const [key, spec] of Object.entries(attrs)) {
      await ensureAttribute(db, collectionId, key, spec);
    }
    const idxFields = INDEXES[collectionId];
    if (idxFields?.length) {
      for (const f of idxFields) {
        if (attrs[f]) await ensureIndex(db, collectionId, f);
      }
    }
  }

  console.log("\nDone. Verify in Console → Databases → scriptony.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
