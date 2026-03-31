#!/usr/bin/env bash
# Bundle + deploy scriptony-mcp-appwrite (internal MCP-style capability host).
# Prerequisites: appwrite CLI login, function id must exist (see appwrite-create-functions.sh extension or manual create).
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-mcp-appwrite"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-mcp-appwrite (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-mcp-appwrite/index.ts \
  --bundle \
  --platform=node \
  --target=node16 \
  --format=cjs \
  --outfile="$STAGE/index.js"

if [[ ! -s "$STAGE/index.js" ]]; then
  echo "error: bundle is missing or empty: $STAGE/index.js" >&2
  exit 1
fi

echo "Deploying bundle…"
npx --yes appwrite-cli functions create-deployment \
  --function-id scriptony-mcp-appwrite \
  --code ".deploy-staging/scriptony-mcp-appwrite" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo "Done. Add domain for scriptony-mcp-appwrite to VITE_BACKEND_FUNCTION_DOMAIN_MAP if needed."
