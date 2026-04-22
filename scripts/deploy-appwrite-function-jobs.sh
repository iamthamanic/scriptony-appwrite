#!/usr/bin/env bash
# Deploy scriptony-jobs-handler to Appwrite
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-jobs-handler"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-jobs-handler (esbuild)…"
cd "$FUN"

npx esbuild scriptony-jobs-handler/index.ts \
  --bundle \
  --platform=node \
  --target=node16 \
  --format=cjs \
  --outfile=scriptony-jobs-handler/index.js \
  --legal-comments=none \
  --external:node:*

if [[ ! -s "$FUN/scriptony-jobs-handler/index.js" ]]; then
  echo "error: bundle is missing or empty: $FUN/scriptony-jobs-handler/index.js" >&2
  exit 1
fi

cp "$FUN/scriptony-jobs-handler/index.js" "$STAGE/index.js"

echo "Deploying bundle (entrypoint index.js)…"
npx --yes appwrite-cli functions create-deployment \
  --function-id scriptony-jobs-handler \
  --code ".deploy-staging/scriptony-jobs-handler" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo ""
echo "Done. scriptony-jobs-handler deployed successfully."
