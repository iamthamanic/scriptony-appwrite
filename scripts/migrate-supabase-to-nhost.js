/**
 * One-time migration: Supabase → Nhost
 *
 * Reads projects, organizations, worlds, timeline_nodes, shots, characters, etc.
 * from Supabase and inserts them into Nhost (Hasura). Replaces all Supabase
 * user IDs with Nhost user IDs via a mapping file.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   NHOST_GRAPHQL_URL=https://xxx.nhost.run/v1/graphql \
 *   NHOST_ADMIN_SECRET=xxx \
 *   USER_ID_MAPPING_PATH=./user-id-mapping.json \
 *   node scripts/migrate-supabase-to-nhost.js
 *
 * Optional: --dry-run (only fetch from Supabase, do not write to Nhost)
 */

const fs = require("fs");
const path = require("path");

// Load .env.migration or .env so secrets don't need to be passed on the CLI
require("./load-migration-env.js");

// -----------------------------------------------------------------------------
// Config: tables to migrate in dependency order; columns that reference auth users
// -----------------------------------------------------------------------------
const TABLES_IN_ORDER = [
  "organizations",      // owner_id
  "organization_members", // user_id
  "worlds",
  "world_categories",
  "world_items",
  "projects",           // user_id, organization_id stays
  "episodes",
  "characters",         // user_id
  "scenes",
  "scene_characters",
  "timeline_nodes",     // user_id
  "shots",              // user_id
  "shot_audio",
  "story_beats",        // user_id
];

const USER_COLUMNS_BY_TABLE = {
  organizations: ["owner_id"],
  organization_members: ["user_id"],
  projects: ["user_id"],
  characters: ["user_id"],
  timeline_nodes: ["user_id"],
  shots: ["user_id"],
  story_beats: ["user_id"],
};

// -----------------------------------------------------------------------------
// Env
// -----------------------------------------------------------------------------
function env(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const NHOST_GRAPHQL_URL = process.env.NHOST_GRAPHQL_URL || "";
const NHOST_ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET || "";
const USER_ID_MAPPING_PATH = process.env.USER_ID_MAPPING_PATH || path.join(__dirname, "user-id-mapping.json");
const DRY_RUN = process.argv.includes("--dry-run");

// -----------------------------------------------------------------------------
// Load user mapping (from env USER_ID_MAPPING_JSON or from file)
// -----------------------------------------------------------------------------
function loadUserMapping() {
  const fromEnv = process.env.USER_ID_MAPPING_JSON || process.env.MIGRATION_USER_ID_MAPPING_JSON;
  if (fromEnv && fromEnv.trim()) {
    try {
      const raw = JSON.parse(fromEnv);
      const map = {};
      for (const [k, v] of Object.entries(raw)) {
        if (k && v) map[k] = v;
      }
      return map;
    } catch (e) {
      console.error("Invalid USER_ID_MAPPING_JSON in env:", e.message);
      process.exit(1);
    }
  }
  const p = path.resolve(USER_ID_MAPPING_PATH);
  if (!fs.existsSync(p)) {
    console.error(`User mapping file not found: ${p}`);
    console.error("Create a JSON file or set env USER_ID_MAPPING_JSON with { \"supabase-uuid\": \"nhost-uuid\", ... }");
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const map = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k && v) map[k] = v;
  }
  return map;
}

// -----------------------------------------------------------------------------
// Supabase REST: fetch all rows from a table
// -----------------------------------------------------------------------------
async function supabaseFetchTable(tableName) {
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${tableName}?select=*`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Supabase ${tableName}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// -----------------------------------------------------------------------------
// Apply user mapping to one row
// -----------------------------------------------------------------------------
function mapUserIds(row, tableName, userMapping) {
  const cols = USER_COLUMNS_BY_TABLE[tableName];
  if (!cols) return row;
  const out = { ...row };
  for (const col of cols) {
    if (out[col] != null && userMapping[out[col]]) {
      out[col] = userMapping[out[col]];
    }
  }
  return out;
}

// -----------------------------------------------------------------------------
// Hasura GraphQL: run mutation (admin)
// -----------------------------------------------------------------------------
async function hasuraRequest(query, variables) {
  const res = await fetch(NHOST_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": NHOST_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors && body.errors.length) {
    throw new Error(`Hasura: ${body.errors.map((e) => e.message).join("; ")}`);
  }
  if (!res.ok) throw new Error(`Hasura HTTP ${res.status}`);
  return body.data;
}

// -----------------------------------------------------------------------------
// Insert one table: bulk insert via Hasura
// -----------------------------------------------------------------------------
async function insertIntoNhost(tableName, rows) {
  if (!rows.length) return 0;
  // Hasura insert_<table>(objects: [...])
  const op = `insert_${tableName}`;
  const mutation = `
    mutation Migrate_${tableName}($objects: [${tableName}_insert_input!]!) {
      ${op}(objects: $objects) {
        affected_rows
      }
    }
  `;
  const data = await hasuraRequest(mutation, { objects: rows });
  const n = data?.[op]?.affected_rows ?? 0;
  return n;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!DRY_RUN && (!NHOST_GRAPHQL_URL || !NHOST_ADMIN_SECRET)) {
    console.error("Set NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET");
    process.exit(1);
  }

  const userMapping = loadUserMapping();
  console.log("User mapping entries:", Object.keys(userMapping).length);
  if (DRY_RUN) console.log("DRY RUN: will not write to Nhost\n");

  let totalInserted = 0;
  for (const tableName of TABLES_IN_ORDER) {
    try {
      const rows = await supabaseFetchTable(tableName);
      if (!Array.isArray(rows)) {
        console.warn(`  ${tableName}: unexpected response, skip`);
        continue;
      }
      const mapped = rows.map((r) => mapUserIds(r, tableName, userMapping));
      if (mapped.length === 0) {
        console.log(`  ${tableName}: 0 rows`);
        continue;
      }
      if (DRY_RUN) {
        console.log(`  ${tableName}: ${mapped.length} rows (dry-run, not inserted)`);
        totalInserted += mapped.length;
        continue;
      }
      const n = await insertIntoNhost(tableName, mapped);
      console.log(`  ${tableName}: ${n} inserted`);
      totalInserted += n;
    } catch (e) {
      console.error(`  ${tableName}: ERROR`, e.message);
      // Continue with next table; some tables may not exist in older Supabase
    }
  }

  console.log("\nDone. Total rows inserted:", totalInserted);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
