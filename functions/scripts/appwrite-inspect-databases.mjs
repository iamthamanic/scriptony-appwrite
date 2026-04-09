/**
 * Listet Datenbanken und sucht die Collection `api_keys` (für AI_DATABASE_ID).
 *
 *   cd functions && npm run appwrite:inspect-databases
 *   # oder vom Repo-Root: npm run appwrite:inspect-databases
 *
 * Location: functions/scripts/appwrite-inspect-databases.mjs
 */

import { getMissingAppwriteServerEnvKeys } from "./load-appwrite-cli-env.mjs";

import { Client, Databases } from "node-appwrite";

const missingEnv = getMissingAppwriteServerEnvKeys();
if (missingEnv.length > 0) {
  console.error("Fehlende Umgebungsvariablen:");
  for (const line of missingEnv) {
    console.error(`  • ${line}`);
  }
  console.error("\nRepo-Root `.env.local` anlegen (siehe `.env.local.example`).");
  process.exit(1);
}

const endpoint = process.env.APPWRITE_ENDPOINT?.trim();
const project = process.env.APPWRITE_PROJECT_ID?.trim();
const key = process.env.APPWRITE_API_KEY?.trim();

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
const databases = new Databases(client);

let dbList;
try {
  dbList = await databases.list();
} catch (e) {
  console.error("Appwrite list databases failed:", e.message || e);
  process.exit(1);
}

console.log(`Endpoint: ${endpoint}`);
console.log(`Project:  ${project}`);
console.log("");
console.log("Datenbanken:");
if (!dbList.databases?.length) {
  console.log("  (keine)");
} else {
  for (const db of dbList.databases) {
    console.log(`  - $id=${db.$id}  name=${db.name ?? ""}`);
  }
}

const expected = (process.env.AI_DATABASE_ID?.trim() || "scriptony_ai").toLowerCase();
const hasExpected = dbList.databases?.some((d) => d.$id.toLowerCase() === expected);
console.log("");
console.log(`Erwartet für scriptony-ai (Default): AI_DATABASE_ID=${expected}`);
console.log(hasExpected ? `  → vorhanden.` : `  → fehlt auf diesem Server — anlegen oder AI_DATABASE_ID setzen.`);

console.log("");
console.log('Suche Collection "api_keys":');

let found = false;
for (const db of dbList.databases || []) {
  let cols;
  try {
    cols = await databases.listCollections(db.$id);
  } catch {
    continue;
  }
  const apiKeys = cols.collections?.filter((c) => c.$id === "api_keys" || c.name === "api_keys");
  if (apiKeys?.length) {
    found = true;
    console.log(`  → gefunden in Datenbank $id=${db.$id} (${db.name ?? ""})`);
  }
}

if (!found) {
  console.log("  → nirgends gefunden (Collection ggf. noch anlegen).");
}

process.exit(0);
