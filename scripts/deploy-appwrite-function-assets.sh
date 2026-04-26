#!/usr/bin/env bash
# Deploy scriptony-assets to Appwrite (new active deployment).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-assets"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-assets (esbuild)…"
cd "$FUN"
npx esbuild scriptony-assets/appwrite-entry.ts \
  --bundle \
  --platform=node \
  --target=node16 \
  --format=cjs \
  --outfile=scriptony-assets/index.js \
  --legal-comments=none \
  --external:node:*

if [[ ! -s "$FUN/scriptony-assets/index.js" ]]; then
  echo "error: bundle is missing or empty: $FUN/scriptony-assets/index.js" >&2
  exit 1
fi

cp "$FUN/scriptony-assets/index.js" "$STAGE/index.js"

echo "Deploying bundle (entrypoint index.js)…"
/opt/homebrew/bin/appwrite functions create-deployment \
  --function-id scriptony-assets \
  --code ".deploy-staging/scriptony-assets" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo ""
echo "Done."
