#!/usr/bin/env bash
# Track all public.* tables in Hasura (Nhost docker-compose on same host).
# Run on the VPS in SSH — no Mac browser required.
# Needs: bash, curl, python3, docker.
# Usage:
#   bash scripts/nhost-hasura-track-all-public.sh [PATH_TO_NHOST_.env]
# Default env path: ~/nhost-upstream/examples/docker-compose/.env
# Location: scripts/nhost-hasura-track-all-public.sh

set -euo pipefail

ENV_FILE="${1:-$HOME/nhost-upstream/examples/docker-compose/.env}"
GRAPHQL_HOST="${GRAPHQL_HOST:-local.graphql.local.nhost.run}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env: $ENV_FILE" >&2
  exit 1
fi

ADMIN="$(grep '^GRAPHQL_ADMIN_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//;s/["'\'']$//')"
if [[ -z "$ADMIN" ]]; then
  echo "GRAPHQL_ADMIN_SECRET empty in $ENV_FILE" >&2
  exit 1
fi

PG_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E 'postgres' | grep -v migrate | head -n1 || true)"
if [[ -z "$PG_CONTAINER" ]]; then
  echo "No Postgres container found." >&2
  exit 1
fi

echo "Hasura Host header: $GRAPHQL_HOST"
echo "Postgres container: $PG_CONTAINER"

cnt="$(docker exec "$PG_CONTAINER" psql -U postgres -d postgres -Atc \
  "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';" | tr -d '[:space:]')"
if [[ "${cnt:-0}" -eq 0 ]]; then
  echo "No tables in schema public." >&2
  exit 1
fi

ok=0
skip=0
fail=0

while IFS= read -r t; do
  [[ -z "$t" ]] && continue

  body="$(TABLE="$t" python3 -c 'import json, os; print(json.dumps({"type":"pg_track_table","args":{"source":"default","table":{"schema":"public","name":os.environ["TABLE"]}}}))')"

  code="$(curl -sS -o /tmp/htrack.json -w "%{http_code}" \
    -H "Host: $GRAPHQL_HOST" \
    -H "X-Hasura-Admin-Secret: $ADMIN" \
    -H "Content-Type: application/json" \
    -d "$body" \
    "http://127.0.0.1/v1/metadata" || echo "000")"

  msg="$(cat /tmp/htrack.json 2>/dev/null || true)"
  if [[ "$code" == "200" ]]; then
    echo "  track ok: public.$t"
    ok=$((ok + 1))
  elif echo "$msg" | grep -qiE 'already tracked|already been tracked|duplicate'; then
    echo "  skip: public.$t"
    skip=$((skip + 1))
  else
    echo "  FAIL ($code) public.$t: $msg" >&2
    fail=$((fail + 1))
  fi
done < <(
  docker exec "$PG_CONTAINER" psql -U postgres -d postgres -Atc \
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
)

echo "Done: ok=$ok skip=$skip fail=$fail"
[[ "$fail" -eq 0 ]]
