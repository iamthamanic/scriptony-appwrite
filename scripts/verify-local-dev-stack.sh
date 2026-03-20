#!/usr/bin/env bash
# Quick health checks for docker compose --profile local-dev (Postgres / Hasura / Lucia auth).
set -euo pipefail
echo "== docker compose ps (local-dev) =="
docker compose --profile local-dev ps
echo ""
echo "== Postgres (5432) =="
docker compose --profile local-dev exec -T postgres pg_isready -U "${POSTGRES_USER:-scriptony}" || true
echo ""
echo "== Hasura /healthz (8080) =="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8080/healthz || echo "curl failed"
echo ""
echo "== Auth /health (3001) =="
curl -sS http://127.0.0.1:3001/health || echo "curl failed"
echo ""
