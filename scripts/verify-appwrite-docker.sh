#!/usr/bin/env bash
# Health check for root docker compose (Appwrite via Traefik on host 8080).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE=infra/appwrite/.env
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run: cp infra/appwrite/.env.example infra/appwrite/.env"
  exit 1
fi
echo "== docker compose ps (Appwrite stack) =="
docker compose --env-file "$ENV_FILE" ps
echo ""
echo "== Appwrite /v1/health (Traefik → :8080) =="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8080/v1/health || echo "curl failed (is the stack up?)"
echo ""
