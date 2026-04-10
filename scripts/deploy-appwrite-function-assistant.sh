#!/usr/bin/env bash
# Deploy scriptony-assistant to Appwrite (new active deployment).
# Fixes "Failed to fetch" / KI settings when the function was never deployed or the domain
# points at an empty deployment — this script uploads a working Node bundle (same pattern as scriptony-shots).
#
# Requires server env (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`)
# via `.env.local` / `.env.server.local` / shell environment.
# Function id `scriptony-assistant` must exist (see `npm run appwrite:functions:create`).
# Run from repo root: `npm run appwrite:deploy:assistant`
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-assistant"

rm -rf "$STAGE"
mkdir -p "$STAGE"

# Appwrite Node runtimes execute JavaScript only. Shipping raw TS or a broken bundle → 503/HTML without CORS
# → browser shows "Failed to fetch". Bundle TS + `_shared` + deps into one CommonJS file (see functions/README.md).
echo "Bundling scriptony-assistant (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-assistant/index.ts \
  --bundle \
  --platform=node \
  --target=node16 \
  --format=cjs \
  --outfile="$STAGE/index.js"

if [[ ! -s "$STAGE/index.js" ]]; then
  echo "error: bundle is missing or empty: $STAGE/index.js" >&2
  exit 1
fi

echo "Deploying bundle (entrypoint index.js)…"
node "$FUN/scripts/deploy-appwrite-function.mjs" \
  --function-id "scriptony-assistant" \
  --source-dir ".deploy-staging/scriptony-assistant" \
  --entrypoint "index.js" \
  --commands "" \
  --sync-default-server-env

echo ""
echo "Done. Next steps (required for the browser):"
echo "  1) Appwrite Console → Functions → scriptony-assistant → Domains:"
echo "     Add the same host you use in VITE_BACKEND_FUNCTION_DOMAIN_MAP[\"scriptony-assistant\"] (HTTPS in production)."
echo "  2) From repo root: npm run verify:test-env  — scriptony-assistant /health should return JSON with service scriptony-assistant."
echo ""
