#!/usr/bin/env bash
# Deploy scriptony-video to Appwrite (new active deployment).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-video"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-video (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-video/index.ts \
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
  --function-id "scriptony-video" \
  --source-dir ".deploy-staging/scriptony-video" \
  --entrypoint "index.js" \
  --commands "" \
  --create-if-missing \
  --sync-default-server-env

echo "Done. Verify video auth reads before enabling new browser routes."
