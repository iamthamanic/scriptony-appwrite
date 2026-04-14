#!/usr/bin/env bash
# Deploy scriptony-stage3d to Appwrite (new active deployment + proxy rule).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-stage3d"
DOMAIN="scriptony-stage3d.appwrite.scriptony.raccoova.com"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-stage3d (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-stage3d/index.ts \
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
  --function-id "scriptony-stage3d" \
  --source-dir ".deploy-staging/scriptony-stage3d" \
  --entrypoint "index.js" \
  --commands "" \
  --sync-default-server-env \
  --create-if-missing

echo ""
echo "Ensuring proxy rule for ${DOMAIN}…"
node "$FUN/scripts/ensure-function-domain.mjs" \
  --function-id "scriptony-stage3d" \
  --domain "$DOMAIN"

echo ""
echo "Done. scriptony-stage3d is deployed and routed."
