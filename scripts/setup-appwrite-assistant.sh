#!/usr/bin/env bash
# One-shot: ensure Appwrite has function `scriptony-assistant`, then bundle + deploy.
# For self-hosted Appwrite: run after `npx appwrite-cli login` + `appwrite init project`.
# Does not configure HTTP domains (Console → Functions → Domains) — run
# `npm run appwrite:sync:function-domains` after domains exist, or edit .env.local manually.
#
# Usage (repo root): npm run appwrite:setup:assistant
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLI=(npx --yes appwrite-cli)
RUNTIME="${APPWRITE_FUNCTIONS_RUNTIME:-node-16.0}"
FUNCTION_ID="scriptony-assistant"

if "${CLI[@]}" functions get --function-id "$FUNCTION_ID" -j >/dev/null 2>&1; then
  echo "Function exists: $FUNCTION_ID"
else
  echo "Creating function: $FUNCTION_ID (runtime $RUNTIME)…"
  "${CLI[@]}" functions create \
    --function-id "$FUNCTION_ID" \
    --name "$FUNCTION_ID" \
    --runtime "$RUNTIME" \
    --execute any \
    --entrypoint "index.js" \
    --commands "npm install"
fi

echo ""
bash "$ROOT/scripts/deploy-appwrite-function-assistant.sh"
