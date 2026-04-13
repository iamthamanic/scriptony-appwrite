#!/usr/bin/env bash
# Deploy scriptony-sync to Appwrite (new active deployment + proxy rule).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-sync"
DOMAIN="scriptony-sync.appwrite.scriptony.raccoova.com"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-sync (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-sync/index.ts \
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
  --function-id "scriptony-sync" \
  --source-dir ".deploy-staging/scriptony-sync" \
  --entrypoint "index.js" \
  --commands "" \
  --sync-default-server-env \
  --create-if-missing

echo ""
echo "Ensuring proxy rule for ${DOMAIN}…"
node "$FUN/scripts/ensure-function-domain.mjs" \
  --function-id "scriptony-sync" \
  --domain "$DOMAIN"

echo ""
echo "Done. scriptony-sync is deployed and routed."
