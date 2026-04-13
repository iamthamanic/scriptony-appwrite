#!/usr/bin/env node
/**
 * Ensures an Appwrite proxy rule exists mapping a subdomain to a function.
 *
 * Tries in order:
 *   1. Server API (needs API key with rules.read/write scopes)
 *   2. Appwrite CLI (needs `appwrite login` session)
 *
 * Usage: node functions/scripts/ensure-function-domain.mjs \
 *          --function-id scriptony-stage \
 *          --domain scriptony-stage.appwrite.scriptony.raccoova.com
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
const serverEnvPath = resolve(root, ".env.server.local");

function parseEnv(text) {
  const out = {};
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

function loadServerEnv() {
  try { return parseEnv(readFileSync(serverEnvPath, "utf8")); }
  catch { return {}; }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      out[key] = argv[++i];
    }
  }
  return out;
}

async function tryServerApi(endpoint, projectId, apiKey, functionId, domain) {
  const headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": projectId,
    "X-Appwrite-Key": apiKey,
  };

  // List rules
  const listRes = await fetch(`${endpoint}/proxy/rules?queries[]=${encodeURIComponent("limit(100)")}`, { headers });
  if (!listRes.ok) return false;
  const listData = await listRes.json();
  const rules = listData.rules || listData.documents || [];
  if (rules.find((r) => r.domain === domain)) {
    console.log(`✅ Proxy rule already exists: ${domain} → ${functionId}`);
    return true;
  }

  // Create rule
  const createRes = await fetch(`${endpoint}/proxy/rules`, {
    method: "POST",
    headers,
    body: JSON.stringify({ domain, resourceType: "functions", resourceId: functionId }),
  });
  if (!createRes.ok) return false;
  const created = await createRes.json();
  console.log(`✅ Proxy rule created via API: ${domain} → ${functionId}`);
  return true;
}

function tryCli(functionId, domain) {
  try {
    // List existing rules via CLI
    const listOut = execSync(
      `npx --yes appwrite-cli proxy list-rules --json 2>/dev/null`,
      { encoding: "utf8", timeout: 15000 }
    );
    const rules = JSON.parse(listOut);
    const ruleList = rules.rules || rules.documents || rules || [];
    if (Array.isArray(ruleList) && ruleList.find((r) => r.domain === domain)) {
      console.log(`✅ Proxy rule already exists: ${domain} → ${functionId}`);
      return true;
    }
  } catch {
    // CLI list failed, try creating directly
  }

  try {
    execSync(
      `npx --yes appwrite-cli proxy create-function-rule --function-id "${functionId}" --domain "${domain}" 2>&1`,
      { encoding: "utf8", timeout: 15000, stdio: "inherit" }
    );
    console.log(`✅ Proxy rule created via CLI: ${domain} → ${functionId}`);
    return true;
  } catch (err) {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const functionId = args.functionId?.trim();
  const domain = args.domain?.trim();
  if (!functionId || !domain) {
    console.log("Usage: node ensure-function-domain.mjs --function-id <id> --domain <domain>");
    process.exit(1);
  }

  const env = { ...loadServerEnv(), ...process.env };
  const endpoint = (env.APPWRITE_ENDPOINT || env.VITE_APPWRITE_ENDPOINT || "").replace(/\/+$/, "");
  const projectId = env.APPWRITE_PROJECT_ID || env.VITE_APPWRITE_PROJECT_ID || "";
  const apiKey = env.APPWRITE_API_KEY || "";

  // Try server API first
  if (endpoint && projectId && apiKey) {
    const ok = await tryServerApi(endpoint, projectId, apiKey, functionId, domain);
    if (ok) return;
    console.log("Server API lacks proxy scope, falling back to CLI…");
  }

  // Try CLI
  const ok = tryCli(functionId, domain);
  if (ok) return;

  // Neither worked
  console.log("");
  console.log("⚠️  Could not create proxy rule automatically.");
  console.log("   The API key lacks `rules.read/rules.write` scopes.");
  console.log("");
  console.log("   Fix option A: Create an API key with Proxy scope in the Appwrite Console:");
  console.log("     → https://appwrite.scriptony.raccoova.com/console/api-keys");
  console.log("     → Add scopes: proxy:read, proxy:write");
  console.log("     → Set it as APPWRITE_API_KEY in .env.server.local");
  console.log("");
  console.log("   Fix option B: Add the domain manually in the Console:");
  console.log(`     → Functions → ${functionId} → Domains → Add: ${domain}`);
  console.log("");
  console.log("   Then re-run this script or verify with:");
  console.log(`     curl http://${domain}/`);
  process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
