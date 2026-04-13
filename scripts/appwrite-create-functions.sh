#!/usr/bin/env bash
# Creates Scriptony HTTP function *definitions* in the linked Appwrite project (CLI).
# Idempotent: skips IDs that already exist.
# Requires: `npx appwrite-cli login` (and `appwrite init project`) from repo root.
# Does not upload code — set entrypoint/build and deploy separately (see functions/README.md).
#
# Location: scripts/appwrite-create-functions.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLI=(npx --yes appwrite-cli)
# Runtimes vary by server; `appwrite functions list-runtimes` — self-hosted often exposes node-16.0.
RUNTIME="${APPWRITE_FUNCTIONS_RUNTIME:-node-16.0}"
# Long runs for OpenRouter/Gemini cover generation (only applied when creating scriptony-image).
SCRIPTONY_IMAGE_TIMEOUT_S="${SCRIPTONY_IMAGE_FUNCTION_TIMEOUT_S:-300}"

FUNCTIONS=(
  make-server-3b52693b
  scriptony-assistant
  scriptony-image
  scriptony-mcp-appwrite
  scriptony-audio
  scriptony-auth
  scriptony-beats
  scriptony-characters
  scriptony-clips
  scriptony-gym
  scriptony-logs
  scriptony-project-nodes
  scriptony-projects
  scriptony-shots
  scriptony-style
  scriptony-stage
  scriptony-stage2d
  scriptony-style-guide
  scriptony-stats
  scriptony-timeline-v2
  scriptony-superadmin
  scriptony-video
  scriptony-worldbuilding
)

for id in "${FUNCTIONS[@]}"; do
  if "${CLI[@]}" functions get --function-id "$id" -j >/dev/null 2>&1; then
    echo "skip (exists): $id"
    continue
  fi
  echo "create: $id"
  if [[ "$id" == "scriptony-image" ]]; then
    "${CLI[@]}" functions create \
      --function-id "$id" \
      --name "$id" \
      --runtime "$RUNTIME" \
      --execute any \
      --timeout "$SCRIPTONY_IMAGE_TIMEOUT_S" \
      --entrypoint "index.js" \
      --commands "npm install"
  else
    "${CLI[@]}" functions create \
      --function-id "$id" \
      --name "$id" \
      --runtime "$RUNTIME" \
      --execute any \
      --entrypoint "index.js" \
      --commands "npm install"
  fi
done

echo "Done. Next: npm run appwrite:provision:schema (DB + collections), configure variables, deploy code (ZIP or appwrite push)."
