#!/usr/bin/env bash
# Deploy scriptony-beats to Appwrite
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-beats"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-beats (esbuild)…"
cd "$FUN"

npx esbuild scriptony-beats/index.ts \
  --bundle \
  --platform=node \
  --target=node16 \
  --format=cjs \
  --outfile=scriptony-beats/index.js \
  --legal-comments=none \
  --external:node:*

if [[ ! -s "$FUN/scriptony-beats/index.js" ]]; then
  echo "error: bundle is missing or empty: $FUN/scriptony-beats/index.js" >&2
  exit 1
fi

cp "$FUN/scriptony-beats/index.js" "$STAGE/index.js"

echo "Deploying bundle (entrypoint index.js)…"
npx --yes appwrite-cli functions create-deployment \
  --function-id scriptony-beats \
  --code ".deploy-staging/scriptony-beats" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo ""
echo "Done. scriptony-beats deployed successfully."
