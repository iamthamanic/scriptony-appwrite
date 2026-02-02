#!/usr/bin/env bash
# Backup Supabase Storage buckets to supabase/backups/storage/
# Run from repo root. Requires: supabase link, --experimental flag.
set -e
cd "$(dirname "$0")/.."
mkdir -p supabase/backups/storage
for bucket in make-3b52693b-world-images make-3b52693b-project-images make-3b52693b-shots make-3b52693b-audio-files make-3b52693b-shot-images make-3b52693b-shot-audio make-3b52693b-shots-audio; do
  echo "--- $bucket ---"
  supabase storage cp -r "ss:///$bucket" "supabase/backups/storage/$bucket" --experimental
done
echo "Done. See supabase/backups/storage/"
