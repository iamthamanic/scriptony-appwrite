#!/usr/bin/env bash
# Deploy scriptony-assistant to Appwrite (new active deployment).
# Fixes "Failed to fetch" / KI settings when the function was never deployed or the domain
# points at an empty deployment — this script uploads a working Node bundle (same pattern as scriptony-shots).
#
# Prerequisite: `npx appwrite-cli login` + `appwrite init project` (linked project).
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
# Must run with cwd = functions/ so relative --code matches appwrite-cli expectations.
npx --yes appwrite-cli functions create-deployment \
  --function-id scriptony-assistant \
  --code ".deploy-staging/scriptony-assistant" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo ""
echo "Done. Next steps (required for the browser):"
echo "  1) Appwrite Console → Functions → scriptony-assistant → Domains:"
echo "     Add the same host you use in VITE_BACKEND_FUNCTION_DOMAIN_MAP[\"scriptony-assistant\"] (HTTPS in production)."
echo "  2) From repo root: npm run verify:test-env  — scriptony-assistant /health should return JSON with service scriptony-assistant."
echo ""
