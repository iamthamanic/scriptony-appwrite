#!/usr/bin/env bash
# Apply supabase/migrations from a given filename prefix onward (sorted).
# Use after a failed mid-stack run, e.g.:
#   docker exec -i "$(docker ps --format '{{.Names}}' | grep -E 'postgres' | grep -v migrate | head -n1)" \
#     psql -U postgres -d postgres -c "DROP TABLE IF EXISTS timeline_nodes CASCADE;"
#   bash scripts/hostinger-resume-migrations.sh 2020010100000012
#
# Location: scripts/hostinger-resume-migrations.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG_DIR="$REPO_ROOT/supabase/migrations"
MIN="${1:-}"

if [[ -z "$MIN" ]]; then
  echo "Usage: $0 <migration_prefix>" >&2
  echo "Example: $0 2020010100000012" >&2
  exit 1
fi

PG_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E 'postgres' | grep -v migrate | head -n1 || true)"
if [[ -z "$PG_CONTAINER" ]]; then
  echo "No running Postgres container found." >&2
  exit 1
fi

echo "Resume from $MIN using container $PG_CONTAINER"

min16="${MIN:0:16}"

while IFS= read -r -d '' f; do
  base="$(basename "$f")"
  pref="${base:0:16}"
  if [[ "$pref" < "$min16" ]]; then
    continue
  fi
  echo "    === $base ==="
  docker exec -i "$PG_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <"$f"
done < <(find "$MIG_DIR" -maxdepth 1 -name '*.sql' -print0 | sort -z)

echo ">>> Resume complete."
