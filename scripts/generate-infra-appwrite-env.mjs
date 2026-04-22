#!/usr/bin/env node
/**
 * Builds a production-ready infra/appwrite/.env from .env.example with:
 * - random _APP_OPENSSL_KEY_V1, _APP_EXECUTOR_SECRET, DB/Redis passwords
 * - Gitpod runtime network names → runtimes (VPS-safe)
 * - your Appwrite hostname on all _APP_DOMAIN* fields (flag --domain)
 *
 * Usage:
 *   node scripts/generate-infra-appwrite-env.mjs --domain=appwrite.example.com
 *   node scripts/generate-infra-appwrite-env.mjs --domain=appwrite.example.com --write
 *
 * Then copy the file into GitHub secret APPWRITE_INFRA_ENV (or use the printed path).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const examplePath = path.join(repoRoot, "infra", "appwrite", ".env.example");
const outPath = path.join(repoRoot, "infra", "appwrite", ".env");

function arg(name) {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p ? p.slice(name.length + 1) : "";
}

const domain = arg("--domain") || process.env.APPWRITE_DOMAIN || "";

const doWrite = process.argv.includes("--write");

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

function randomPass(len = 32) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const buf = crypto.randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[buf[i] % chars.length];
  return s;
}

if (!fs.existsSync(examplePath)) {
  console.error("Missing:", examplePath);
  process.exit(1);
}

if (!domain) {
  console.error(
    "Set your public Appwrite hostname, e.g.\n  node scripts/generate-infra-appwrite-env.mjs --domain=appwrite.deinedomain.de\n",
  );
  process.exit(1);
}

/** e.g. appwrite.example.com → sites.example.com */
function sitesFromDomain(d) {
  const parts = d.split(".").filter(Boolean);
  if (parts.length < 2) return `sites.${d}`;
  return `sites.${parts.slice(1).join(".")}`;
}

const sitesHost = domain.startsWith("sites.")
  ? domain
  : sitesFromDomain(domain);

let text = fs.readFileSync(examplePath, "utf8");

const subs = [
  ["_APP_OPENSSL_KEY_V1=learning-key", `_APP_OPENSSL_KEY_V1=${randomHex(32)}`],
  [
    "_APP_EXECUTOR_SECRET=your-secret-key",
    `_APP_EXECUTOR_SECRET=${randomHex(32)}`,
  ],
  ["_APP_DB_PASS=password", `_APP_DB_PASS=${randomPass(28)}`],
  [
    "_APP_DB_ROOT_PASS=rootsecretpassword",
    `_APP_DB_ROOT_PASS=${randomPass(28)}`,
  ],
  ["_APP_REDIS_PASS=", `_APP_REDIS_PASS=${randomPass(24)}`],
  ["_APP_DOMAIN=localhost", `_APP_DOMAIN=${domain}`],
  ["_APP_DOMAIN_FUNCTIONS=localhost", `_APP_DOMAIN_FUNCTIONS=${domain}`],
  ["_APP_DOMAIN_SITES=sites.localhost", `_APP_DOMAIN_SITES=${sitesHost}`],
  ["_APP_DOMAIN_TARGET=localhost", `_APP_DOMAIN_TARGET=${domain}`],
  ["_APP_DOMAIN_TARGET_CNAME=localhost", `_APP_DOMAIN_TARGET_CNAME=${domain}`],
  ["_APP_SETUP=1-click-gitpod", "_APP_SETUP=server"],
  [
    "_APP_EXECUTOR_RUNTIME_NETWORK=integration-for-gitpod_runtimes",
    "_APP_EXECUTOR_RUNTIME_NETWORK=runtimes",
  ],
  [
    "OPEN_RUNTIMES_NETWORK=integration-for-gitpod_runtimes",
    "OPEN_RUNTIMES_NETWORK=runtimes",
  ],
];

for (const [from, to] of subs) {
  if (!text.includes(from)) {
    console.warn(
      "Warning: pattern not found (file may have changed):",
      from.slice(0, 50),
    );
  }
  text = text.split(from).join(to);
}

if (doWrite) {
  if (fs.existsSync(outPath)) {
    console.error("Refusing --write: already exists:", outPath);
    console.error(
      "Remove it first or run without --write and redirect stdout.",
    );
    process.exit(1);
  }
  fs.writeFileSync(outPath, text, { mode: 0o600 });
  console.log("Wrote", outPath);
} else {
  process.stdout.write(text);
}
