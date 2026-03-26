#!/usr/bin/env bash
# Deploy scriptony-shots to Appwrite (new active deployment).
# Prerequisite: `npx appwrite-cli login` + linked project; function id `scriptony-shots` exists
# (see scripts/appwrite-create-functions.sh). Run from any cwd.
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-shots"

rm -rf "$STAGE"
mkdir -p "$STAGE"

# Appwrite Node runtimes execute JavaScript. Shipping `scriptony-shots/index.ts` without a TS loader
# fails at cold start → HTTP 503 (HTML error page has no CORS → browser shows "CORS" + Failed to fetch).
# Bundle TS + `_shared` + `node-appwrite` into one CommonJS file (see functions/README.md).
echo "Bundling scriptony-shots (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-shots/index.ts \
  --bundle \
  --platform=node \
  --target=node16 \
  --format=cjs \
  --outfile="$STAGE/index.js"

echo "Deploying bundle (entrypoint index.js)…"
npx --yes appwrite-cli functions create-deployment \
  --function-id scriptony-shots \
  --code ".deploy-staging/scriptony-shots" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo "Done."
