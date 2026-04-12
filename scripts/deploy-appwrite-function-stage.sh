#!/usr/bin/env bash
# Deploy scriptony-stage to Appwrite (new active deployment).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-stage"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-stage (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-stage/index.ts \
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
  --function-id "scriptony-stage" \
  --source-dir ".deploy-staging/scriptony-stage" \
  --entrypoint "index.js" \
  --commands "" \
  --sync-default-server-env \
  --create-if-missing

echo ""
echo "Done. Next steps:"
echo "  1) Add the scriptony-stage HTTP domain in Appwrite"
echo "  2) Sync VITE_BACKEND_FUNCTION_DOMAIN_MAP via npm run appwrite:sync:function-domains"
