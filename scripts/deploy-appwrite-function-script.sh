#!/usr/bin/env bash
# Deploy scriptony-script to Appwrite (new active deployment).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-script"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-script (esbuild)…"
cd "$FUN"
npx esbuild scriptony-script/index.ts \
  --bundle \
  --platform=node \
  --target=node16 \
  --format=cjs \
  --outfile=scriptony-script/index.js \
  --legal-comments=none \
  --external:node:*

if [[ ! -s "$FUN/scriptony-script/index.js" ]]; then
  echo "error: bundle is missing or empty: $FUN/scriptony-script/index.js" >&2
  exit 1
fi

cp "$FUN/scriptony-script/index.js" "$STAGE/index.js"

echo "Deploying bundle (entrypoint index.js)…"
/opt/homebrew/bin/appwrite functions create-deployment \
  --function-id scriptony-script \
  --code ".deploy-staging/scriptony-script" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo ""
echo "Done."
