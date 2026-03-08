#!/usr/bin/env node
/**
 * Reads Nhost CLI config (after `nhost link` + `nhost config pull`) and
 * writes Scriptony .env.local with the correct subdomain and region.
 *
 * Usage (from repo root):
 *   node scripts/env-from-nhost-cli.js
 *   npm run env:from-nhost
 *
 * Prerequisites:
 *   1. Install Nhost CLI: sudo curl -L https://raw.githubusercontent.com/nhost/nhost/main/cli/get.sh | bash
 *   2. nhost login
 *   3. nhost link   (select your cloud project)
 *   4. nhost config pull
 *   Then run this script.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATHS = [
  path.join(ROOT, '.nhost', 'nhost.toml'),
  path.join(ROOT, 'nhost', 'nhost.toml'),
];

function readFirstExisting(paths) {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    } catch (_) {}
  }
  return null;
}

function parseSubdomainAndRegion(tomlContent) {
  if (!tomlContent) return null;
  // Prefer [[projects]] blocks (cloud); fallback to first subdomain/region in file
  const projectBlocks = tomlContent.split(/\[\[projects\]\]/);
  for (let i = 1; i < projectBlocks.length; i++) {
    const block = projectBlocks[i];
    const subMatch = block.match(/subdomain\s*=\s*["']([^"']+)["']/);
    const regionMatch = block.match(/region\s*=\s*["']([^"']+)["']/);
    const sub = subMatch ? subMatch[1].trim() : null;
    const reg = regionMatch ? regionMatch[1].trim() : null;
    if (sub && sub !== 'local') {
      return { subdomain: sub, region: reg && reg !== 'local' ? reg : 'eu-central-1' };
    }
  }
  const subMatch = tomlContent.match(/subdomain\s*=\s*["']([^"']+)["']/);
  const regionMatch = tomlContent.match(/region\s*=\s*["']([^"']+)["']/);
  const subdomain = subMatch ? subMatch[1].trim() : null;
  const region = regionMatch ? regionMatch[1].trim() : null;
  if (!subdomain || subdomain === 'local') return null;
  return { subdomain, region: region && region !== 'local' ? region : 'eu-central-1' };
}

function main() {
  const content = readFirstExisting(CONFIG_PATHS);
  const parsed = parseSubdomainAndRegion(content);

  if (!parsed) {
    console.error('Could not find Nhost subdomain/region.');
    console.error('Run in this project:');
    console.error('  nhost login');
    console.error('  nhost link');
    console.error('  nhost config pull');
    console.error('Then run this script again.');
    process.exit(1);
  }

  const { subdomain, region } = parsed;
  const base = `https://${subdomain}`;
  const envLocal = `VITE_APP_WEB_URL=http://localhost:3001

# Nhost (filled from nhost CLI config)
VITE_BACKEND_PROVIDER=nhost
VITE_BACKEND_API_BASE_URL=${base}.functions.${region}.nhost.run/v1
VITE_BACKEND_PUBLIC_TOKEN=

VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

VITE_NHOST_SUBDOMAIN=${subdomain}
VITE_NHOST_REGION=${region}
VITE_NHOST_AUTH_URL=${base}.auth.${region}.nhost.run/v1
VITE_NHOST_STORAGE_URL=${base}.storage.${region}.nhost.run/v1
VITE_NHOST_GRAPHQL_URL=${base}.graphql.${region}.nhost.run/v1
VITE_NHOST_FUNCTIONS_URL=${base}.functions.${region}.nhost.run/v1

SCRIPTONY_STORAGE_BUCKET_GENERAL=
SCRIPTONY_STORAGE_BUCKET_PROJECT_IMAGES=
SCRIPTONY_STORAGE_BUCKET_WORLD_IMAGES=
SCRIPTONY_STORAGE_BUCKET_SHOT_IMAGES=
SCRIPTONY_STORAGE_BUCKET_AUDIO_FILES=

VITE_AUTH_REDIRECT_URL=http://localhost:3001
VITE_PASSWORD_RESET_REDIRECT_URL=http://localhost:3001/reset-password

VITE_CAPACITOR_APP_ID=ai.scriptony.app
VITE_CAPACITOR_URL_SCHEME=scriptony
VITE_CAPACITOR_CALLBACK_HOST=auth-callback
`;

  const outPath = path.join(ROOT, '.env.local');
  fs.writeFileSync(outPath, envLocal, 'utf8');
  console.log('Written', outPath);
  console.log('Subdomain:', subdomain, '| Region:', region);
}

main();
