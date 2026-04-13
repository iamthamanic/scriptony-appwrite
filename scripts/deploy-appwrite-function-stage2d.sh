#!/usr/bin/env bash
# Deploy scriptony-stage2d to Appwrite (new active deployment + proxy rule).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-stage2d"
DOMAIN="scriptony-stage2d.appwrite.scriptony.raccoova.com"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-stage2d (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-stage2d/index.ts \
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
  --function-id "scriptony-stage2d" \
  --source-dir ".deploy-staging/scriptony-stage2d" \
  --entrypoint "index.js" \
  --commands "" \
  --sync-default-server-env \
  --create-if-missing

echo ""
echo "Ensuring proxy rule for ${DOMAIN}…"
node "$FUN/scripts/ensure-function-domain.mjs" \
  --function-id "scriptony-stage2d" \
  --domain "$DOMAIN" || true

echo ""
echo "Done. scriptony-stage2d is deployed."
