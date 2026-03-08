/**
 * Export Supabase auth users (id + email) to build user-id-mapping for Nhost migration.
 *
 * Usage:
 *   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env or in .env.migration / .env
 *   node scripts/export-supabase-users.js
 *
 * Output: JSON array to stdout. Use this to match emails with Nhost users and build
 * scripts/user-id-mapping.json: { "supabase-uuid": "nhost-uuid" }
 */

require("./load-migration-env.js");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const base = SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/auth/v1/admin/users?per_page=1000`;
  const res = await fetch(url, {
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) {
    console.error("Supabase Auth Admin API error:", res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const users = data.users || [];
  const out = users.map((u) => ({ id: u.id, email: u.email || "" }));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
