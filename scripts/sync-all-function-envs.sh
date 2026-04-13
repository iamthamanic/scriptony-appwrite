#!/usr/bin/env bash
# Sync APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY for all functions.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/functions"

source "$ROOT/.env.server.local"

FUNCTIONS=(
  scriptony-ai
  scriptony-assistant
  scriptony-audio
  scriptony-auth
  scriptony-beats
  scriptony-characters
  scriptony-clips
  scriptony-gym
  scriptony-image
  scriptony-logs
  scriptony-mcp-appwrite
  scriptony-project-nodes
  scriptony-projects
  scriptony-shots
  scriptony-stage
  scriptony-stage2d
  scriptony-stats
  scriptony-style
  scriptony-style-guide
  scriptony-superadmin
  scriptony-video
  scriptony-worldbuilding
)

for fn in "${FUNCTIONS[@]}"; do
  echo "Syncing env for $fn..."
  node scripts/deploy-appwrite-function.mjs \
    --function-id "$fn" \
    --source-dir "." \
    --entrypoint "index.js" \
    --sync-default-server-env \
    2>&1 | grep -E "Synced|error|Error" || true
  echo ""
done

echo "Done syncing all function env vars."
