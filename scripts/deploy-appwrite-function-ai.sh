#!/usr/bin/env bash
# Deploy scriptony-ai to Appwrite (new active deployment).
# Ships the prebundled Node-16 compatible CommonJS artifact only, to keep the deployment path deterministic.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-ai"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-ai (esbuild)…"
cd "$FUN"
npm run build:scriptony-ai

if [[ ! -s "$FUN/scriptony-ai/index.js" ]]; then
  echo "error: bundle is missing or empty: $FUN/scriptony-ai/index.js" >&2
  exit 1
fi

cp "$FUN/scriptony-ai/index.js" "$STAGE/index.js"

echo "Deploying bundle (entrypoint index.js)…"
npx --yes appwrite-cli functions create-deployment \
  --function-id scriptony-ai \
  --code ".deploy-staging/scriptony-ai" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo ""
echo "Done. Verify next:"
echo "  1) npm run verify:parity -- --require-auth"
echo "  2) npm run smoke:user-flows"
