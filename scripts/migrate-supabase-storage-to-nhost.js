/**
 * Storage migration: copy files from Supabase Storage to Nhost Storage and update DB URLs.
 *
 * Run this AFTER migrate-supabase-to-nhost.js (so Nhost already has the rows with
 * Supabase URLs in cover_image_url, image_url, file_url, etc.). This script:
 * 1. Queries Nhost for rows that contain Supabase storage URLs
 * 2. Downloads each file from Supabase (using service role if private)
 * 3. Uploads to Nhost Storage (correct bucket per table/column)
 * 4. Updates the row in Nhost with the new Nhost file URL
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   NHOST_GRAPHQL_URL=https://xxx.nhost.run/v1/graphql \
 *   NHOST_ADMIN_SECRET=xxx \
 *   NHOST_STORAGE_URL=https://xxx.nhost.run/v1/storage \
 *   node scripts/migrate-supabase-storage-to-nhost.js
 *
 * Optional: --dry-run (only list URLs that would be migrated, no download/upload/update)
 */

const fs = require("fs");
const path = require("path");

require("./load-migration-env.js");

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const NHOST_GRAPHQL_URL = (process.env.NHOST_GRAPHQL_URL || "").replace(/\/$/, "");
const NHOST_ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET || "";
const NHOST_STORAGE_URL = (process.env.NHOST_STORAGE_URL || "").replace(/\/$/, "");
const DRY_RUN = process.argv.includes("--dry-run");

// Table -> [ { column, nhostBucket } ]
const URL_COLUMNS = [
  { table: "projects", column: "cover_image_url", bucket: "make-3b52693b-project-images" },
  { table: "worlds", column: "cover_image_url", bucket: "make-3b52693b-world-images" },
  { table: "shots", column: "image_url", bucket: "make-3b52693b-shots" },
  { table: "shot_audio", column: "file_url", bucket: "make-3b52693b-audio-files" },
  { table: "characters", column: "avatar_url", bucket: "make-3b52693b-project-images" },
  { table: "characters", column: "image_url", bucket: "make-3b52693b-project-images" },
  { table: "world_items", column: "image_url", bucket: "make-3b52693b-world-images" },
  { table: "scenes", column: "keyframe_image_url", bucket: "make-3b52693b-project-images" },
  { table: "project_inspirations", column: "image_url", bucket: "make-3b52693b-project-images" },
];

function isSupabaseStorageUrl(url) {
  return typeof url === "string" && url.includes("supabase.co/storage") && url.trim().length > 0;
}

// Parse Supabase storage URL to get bucket and path for API download (private bucket)
function parseSupabaseStorageUrl(url) {
  // https://xxx.supabase.co/storage/v1/object/public/BUCKET/path or /object/significant/BUCKET/path
  const m = url.match(/\/storage\/v1\/object\/(?:public|significant|authenticated)\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { bucket: m[1], path: m[2] };
}

async function downloadFromSupabase(url) {
  const parsed = parseSupabaseStorageUrl(url);
  if (!parsed) {
    // Try direct fetch (public URL)
    const res = await fetch(url, {
      headers: SUPABASE_SERVICE_ROLE_KEY ? { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } : {},
    });
    if (!res.ok) throw new Error(`Download ${res.status}: ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    return { buffer: buf, contentType };
  }
  const apiUrl = `${SUPABASE_URL}/storage/v1/object/authenticated/${parsed.bucket}/${parsed.path}`;
  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase storage ${res.status}: ${parsed.bucket}/${parsed.path}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  return { buffer: buf, contentType };
}

async function uploadToNhost(buffer, contentType, bucketId, fileName) {
  const form = new FormData();
  form.append("bucket-id", bucketId);
  const blob = new Blob([buffer], { type: contentType });
  form.append("file[]", blob, fileName);

  const res = await fetch(`${NHOST_STORAGE_URL}/files`, {
    method: "POST",
    headers: {
      "x-hasura-admin-secret": NHOST_ADMIN_SECRET,
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nhost upload ${res.status}: ${text}`);
  }
  const data = await res.json();
  const processed = data.processedFiles ?? data.ProcessedFiles ?? data.processed_files;
  const list = Array.isArray(processed) ? processed : processed ? [processed] : [];
  const file = list[0];
  if (!file?.id) throw new Error("Nhost upload returned no file id: " + JSON.stringify(data).slice(0, 200));
  return file.id;
}

async function getNhostPresignedUrl(fileId) {
  const res = await fetch(`${NHOST_STORAGE_URL}/files/${fileId}/presignedurl`, {
    headers: {
      "x-hasura-admin-secret": NHOST_ADMIN_SECRET,
    },
  });
  if (!res.ok) throw new Error(`Presigned URL ${res.status}`);
  const data = await res.json();
  const url = data.url ?? data.presignedUrl ?? data.presigned_url;
  if (!url) throw new Error("No presigned URL in response: " + JSON.stringify(data).slice(0, 150));
  return url;
}

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
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
  if (!res.ok) throw new Error(`GraphQL ${res.status}`);
  return body.data;
}

async function fetchTableWithUrl(tableName, columnName) {
  const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, "_");
  const safeCol = columnName.replace(/[^a-zA-Z0-9_]/g, "_");
  const query = `
    query MigrateStorage_${safeTable}_${safeCol} {
      ${tableName}(where: { ${columnName}: { _ilike: "%supabase.co/storage%" } }) {
        id
        ${columnName}
      }
    }
  `;
  const data = await hasuraRequest(query, {});
  const rows = data?.[tableName];
  return Array.isArray(rows) ? rows : [];
}

async function updateRowUrl(tableName, columnName, id, newUrl) {
  const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, "_");
  const mutation = `
    mutation UpdateStorageUrl_${safeTable}($id: uuid!, $url: String) {
      update_${tableName}_by_pk(pk_columns: { id: $id }, _set: { ${columnName}: $url }) {
        id
      }
    }
  `;
  await hasuraRequest(mutation, { id, url: newUrl });
}

function getExtensionFromUrl(url) {
  const pathPart = url.split("?")[0];
  const last = pathPart.split("/").pop() || "";
  const dot = last.lastIndexOf(".");
  return dot > 0 ? last.slice(dot) : ".bin";
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!DRY_RUN && (!NHOST_GRAPHQL_URL || !NHOST_ADMIN_SECRET || !NHOST_STORAGE_URL)) {
    console.error("Set NHOST_GRAPHQL_URL, NHOST_ADMIN_SECRET, NHOST_STORAGE_URL");
    process.exit(1);
  }
  if (DRY_RUN) console.log("DRY RUN: no download/upload/update\n");

  let total = 0;
  let errors = 0;
  for (const { table, column, bucket } of URL_COLUMNS) {
    try {
      const rows = await fetchTableWithUrl(table, column);
      for (const row of rows) {
        const oldUrl = row[column];
        if (!isSupabaseStorageUrl(oldUrl)) continue;
        total++;
        const id = row.id;
        const label = `${table}.${column} id=${id}`;
        if (DRY_RUN) {
          console.log(`  [would migrate] ${label} -> ${oldUrl.slice(0, 60)}...`);
          continue;
        }
        try {
          const { buffer, contentType } = await downloadFromSupabase(oldUrl);
          const ext = getExtensionFromUrl(oldUrl);
          const fileName = `${table}-${id}-${column}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
          const fileId = await uploadToNhost(buffer, contentType, bucket, fileName);
          const newUrl = await getNhostPresignedUrl(fileId);
          await updateRowUrl(table, column, id, newUrl);
          console.log(`  [ok] ${label}`);
        } catch (e) {
          errors++;
          console.error(`  [error] ${label}: ${e.message}`);
        }
      }
    } catch (e) {
      console.error(`  ${table}.${column}: query failed: ${e.message}`);
    }
  }
  console.log("\nDone. Total rows with Supabase URLs:", total);
  if (!DRY_RUN && errors) console.log("Errors:", errors);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
