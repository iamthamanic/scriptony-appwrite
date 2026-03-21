#!/usr/bin/env bash
# Run ON THE VPS inside the cloned repo (after git pull).
# Starts the Appwrite stack from the repo root (same as CI deploy).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE=infra/appwrite/.env
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — cp infra/appwrite/.env.example $ENV_FILE && edit secrets"
  exit 1
fi
docker compose --env-file "$ENV_FILE" pull || true
docker compose --env-file "$ENV_FILE" up -d
