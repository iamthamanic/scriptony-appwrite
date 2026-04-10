#!/usr/bin/env bash
# Deploy scriptony-image to Appwrite (new active deployment).
# Per execution: raises Appwrite’s function timeout (default 300s) via CLI — image APIs often need >60s.
# Override: SCRIPTONY_IMAGE_FUNCTION_TIMEOUT_S=600
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-image"
TIMEOUT_S="${SCRIPTONY_IMAGE_FUNCTION_TIMEOUT_S:-300}"

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
  --sync-default-server-env \
  --timeout "$TIMEOUT_S"

echo ""
echo "Done. Ensure domain map contains scriptony-image and points to this function domain."
echo "Timeout was set to ${TIMEOUT_S}s. Override next deploy: SCRIPTONY_IMAGE_FUNCTION_TIMEOUT_S=600"
echo "Optional function variables: SCRIPTONY_IMAGE_UPSTREAM_TIMEOUT_MS (ms);"
echo "  SCRIPTONY_OPENROUTER_IMAGE_MAX_TOKENS (default 1024, avoids OpenRouter 402 on huge default ceilings)."
