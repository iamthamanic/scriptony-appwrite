#!/usr/bin/env bash
# Deploy scriptony-audio-story to Appwrite
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-audio-story"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-audio-story (esbuild)..."
cd "$FUN"

npx esbuild scriptony-audio-story/appwrite-entry.ts \
  --bundle \
  --platform=node \
  --target=node16 \
  --format=cjs \
  --outfile=scriptony-audio-story/index.js \
  --legal-comments=none \
  --external:node:*

if [[ ! -s "$FUN/scriptony-audio-story/index.js" ]]; then
  echo "error: bundle is missing or empty: $FUN/scriptony-audio-story/index.js" >&2
  exit 1
fi

cp "$FUN/scriptony-audio-story/index.js" "$STAGE/index.js"

echo "Deploying bundle (entrypoint index.js)..."
npx --yes appwrite-cli functions create-deployment \
  --function-id scriptony-audio-story \
  --code ".deploy-staging/scriptony-audio-story" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo ""
echo "Done. scriptony-audio-story deployed successfully."
