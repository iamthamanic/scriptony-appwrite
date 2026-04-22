/**
 * Load .env.migration or .env into process.env (only if not already set).
 * Lookup order: cwd/.env.migration, cwd/.env, scriptDir/.env.migration, scriptDir/.env.
 * Use for migration scripts so secrets can be stored in a file (never commit .env / .env.migration).
 */
const fs = require("fs");
const path = require("path");

const SCRIPT_DIR = path.resolve(__dirname);

function loadOne(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) {
      const key = m[1];
      if (process.env[key] === undefined) {
        let val = m[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        )
          val = val.slice(1, -1).replace(/\\n/g, "\n");
        process.env[key] = val;
      }
    }
  }
  return true;
}

function loadMigrationEnv() {
  const cwd = process.cwd();
  if (loadOne(path.join(cwd, ".env.migration"))) return;
  if (loadOne(path.join(cwd, ".env"))) return;
  if (loadOne(path.join(SCRIPT_DIR, ".env.migration"))) return;
  loadOne(path.join(SCRIPT_DIR, ".env"));
}

loadMigrationEnv();
