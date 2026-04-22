#!/bin/bash
set -e

echo "🎵 Deploying scriptony-audio-story..."

# Load env
set -a
source .env.local 2>/dev/null || echo "No .env.local found"
set +a

APPWRITE_ENDPOINT="${APPWRITE_ENDPOINT:-http://localhost:8080/v1}"
APPWRITE_PROJECT_ID="${APPWRITE_PROJECT_ID:-scriptony}"
APPWRITE_API_KEY="${APPWRITE_API_KEY:-}"

if [ -z "$APPWRITE_API_KEY" ]; then
  echo "❌ APPWRITE_API_KEY not set"
  exit 1
fi

cd "$(dirname "$0")/.."

# Ensure deno is available
if ! command -v deno &> /dev/null; then
  echo "❌ Deno not found"
  exit 1
fi

# Deploy function
echo "📦 Deploying function..."
npx appwrite deploy function \
  --function-id scriptony-audio-story \
  --name "Audio Story Production" \
  --runtime deno-1.40 \
  --entrypoint functions/scriptony-audio-story/appwrite-entry.ts \
  --path functions/scriptony-audio-story/ \
  --permissions "["any"]" \
  --timeout 300 \
  --memory 1024 \
  --env "SCRIPTONY_APPWRITE_API_ENDPOINT=http://appwrite/v1,APPWRITE_FUNCTION_PROJECT_ID=scriptony"

echo "✅ Function deployed!"

# Create/update collections
echo "🗄️ Creating collections..."
node scripts/create-audio-collections.js

echo "🎉 Deployment complete!"
