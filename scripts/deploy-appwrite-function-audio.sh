#!/usr/bin/env bash
# Deploy scriptony-audio to Appwrite (new active deployment).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-audio"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-audio (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-audio/index.ts \
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
  --function-id "scriptony-audio" \
  --source-dir ".deploy-staging/scriptony-audio" \
  --entrypoint "index.js" \
  --commands "" \
  --sync-default-server-env

echo "Done. Verify auth reads on /tts/voices or /shots/... audio routes."
