#!/usr/bin/env bash
# Deploy scriptony-image to Appwrite (new active deployment + proxy rule).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-image"
DOMAIN="scriptony-image.appwrite.scriptony.raccoova.com"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-image (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-image/index.ts \
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
  --function-id "scriptony-image" \
  --source-dir ".deploy-staging/scriptony-image" \
  --entrypoint "index.js" \
  --commands "" \
  --timeout 300 \
   \
  

echo ""
echo "Ensuring proxy rule for ${DOMAIN}…"
node "$FUN/scripts/ensure-function-domain.mjs" \
  --function-id "scriptony-image" \
  --domain "$DOMAIN" || true

echo ""
echo "Done. scriptony-image is deployed."
