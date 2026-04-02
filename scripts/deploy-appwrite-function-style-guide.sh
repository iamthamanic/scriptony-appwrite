#!/usr/bin/env bash
# Deploy scriptony-style-guide to Appwrite (new active deployment).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-style-guide"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-style-guide (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-style-guide/index.ts \
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
npx --yes appwrite-cli functions create-deployment \
  --function-id scriptony-style-guide \
  --code ".deploy-staging/scriptony-style-guide" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo "Done. Add scriptony-style-guide to VITE_BACKEND_FUNCTION_DOMAIN_MAP (npm run appwrite:sync:function-domains)."
