#!/usr/bin/env bash
# Deploy scriptony-projects to Appwrite (new active deployment).
# Ships the prebundled Node-16 compatible CommonJS artifact only, to keep the deployment path deterministic.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-projects"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-projects (esbuild)…"
cd "$FUN"

# Build the function with esbuild
npx esbuild scriptony-projects/index.ts \
  --bundle \
  --platform=node \
  --target=node16 \
  --format=cjs \
  --outfile=scriptony-projects/index.js \
  --legal-comments=none \
  --external:node:*

if [[ ! -s "$FUN/scriptony-projects/index.js" ]]; then
  echo "error: bundle is missing or empty: $FUN/scriptony-projects/index.js" >&2
  exit 1
fi

cp "$FUN/scriptony-projects/index.js" "$STAGE/index.js"

echo "Deploying bundle (entrypoint index.js)…"
npx --yes appwrite-cli functions create-deployment \
  --function-id scriptony-projects \
  --code ".deploy-staging/scriptony-projects" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo ""
echo "Done. Verify next:"
echo "  1) npm run verify:parity -- --require-auth"
echo "  2) npm run smoke:user-flows"
