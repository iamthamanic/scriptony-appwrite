#!/usr/bin/env bash
# Run ON THE VPS (Hostinger SSH), after Nhost Docker stack is up.
# Applies Scriptony supabase/migrations to the Nhost Postgres container.
# Repo: scripts/hostinger-apply-schema.sh — see docs/HOSTINGER_CONSOLE_COMMANDS.md

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG_DIR="$REPO_ROOT/supabase/migrations"

if [[ ! -d "$MIG_DIR" ]]; then
  echo "Expected migrations at $MIG_DIR — run this script from a full Scriptony clone." >&2
  exit 1
fi

PG_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E 'postgres' | grep -v migrate | head -n1 || true)"
if [[ -z "$PG_CONTAINER" ]]; then
  echo "No running Postgres container found (docker ps). Start Nhost compose first." >&2
  exit 1
fi

echo "Using Postgres container: $PG_CONTAINER"

echo ">>> Stub auth.uid() (Supabase-RLS in migrations; Hasura nutzt JWT — Stub nur damit SQL läuft)"
docker exec -i "$PG_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'EOSQL'
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$ SELECT NULL::uuid $$;
EOSQL

echo ">>> Applying $(find "$MIG_DIR" -maxdepth 1 -name '*.sql' | wc -l | tr -d ' ') migration files (sorted)"
while IFS= read -r -d '' f; do
  echo "    === $(basename "$f") ==="
  docker exec -i "$PG_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <"$f"
done < <(find "$MIG_DIR" -maxdepth 1 -name '*.sql' -print0 | sort -z)

echo ">>> Done. Nächster Schritt: Hasura — alle public-Tabellen tracken (Browser), siehe docs/HOSTINGER_CONSOLE_COMMANDS.md"
