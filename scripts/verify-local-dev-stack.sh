#!/usr/bin/env bash
# Quick health checks for docker-compose.legacy.yml --profile local-dev (Postgres / GraphQL console / Lucia auth).
set -euo pipefail
LEGACY_COMPOSE=(docker compose -f docker-compose.legacy.yml --profile local-dev)
echo "== docker compose ps (local-dev, legacy file) =="
"${LEGACY_COMPOSE[@]}" ps
echo ""
echo "== Postgres (5432) =="
"${LEGACY_COMPOSE[@]}" exec -T postgres pg_isready -U "${POSTGRES_USER:-scriptony}" || true
echo ""
echo "== Local GraphQL engine /healthz (8080) =="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8080/healthz || echo "curl failed"
echo ""
echo "== Auth /health (3001) =="
curl -sS http://127.0.0.1:3001/health || echo "curl failed"
echo ""
