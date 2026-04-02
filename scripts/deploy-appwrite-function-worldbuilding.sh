#!/usr/bin/env bash
# Deploy scriptony-worldbuilding to Appwrite (new active deployment).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-worldbuilding"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-worldbuilding (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-worldbuilding/index.ts \
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
  --function-id scriptony-worldbuilding \
  --code ".deploy-staging/scriptony-worldbuilding" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo "Done. Add scriptony-worldbuilding to VITE_BACKEND_FUNCTION_DOMAIN_MAP (npm run appwrite:sync:function-domains)."
