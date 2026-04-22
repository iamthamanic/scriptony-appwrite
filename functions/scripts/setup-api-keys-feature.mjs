/**
 * Ein Befehl: Schema (Attribut feature) + Daten-Migration (Legacy-Zeilen).
 * Nutzt die Appwrite Server API (node-appwrite), keine separate Appwrite CLI-Installation.
 *
 *   cd functions && npm run setup:api-keys-feature
 *
 * Location: functions/scripts/setup-api-keys-feature.mjs
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const dir = path.dirname(fileURLToPath(import.meta.url));

function run(script) {
  execSync(`node ${path.join(dir, script)}`, {
    stdio: "inherit",
    env: process.env,
  });
}

run("ensure-api-keys-feature-attribute.mjs");
run("migrate-api-keys-feature.mjs");
