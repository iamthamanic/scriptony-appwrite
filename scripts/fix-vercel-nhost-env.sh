#!/usr/bin/env bash
# Setzt VITE_NHOST_SUBDOMAIN auf die richtige Nhost-Subdomain (mthatsgmfklegprnulnn)
# und löst einen Production-Redeploy aus.
#
# Voraussetzung: Einmal im Projektordner vercel login (oder VERCEL_TOKEN gesetzt).
# Optional: vercel link, falls Projekt noch nicht verknüpft.
#
# Aufruf: ./scripts/fix-vercel-nhost-env.sh
# Oder mit Token: VERCEL_TOKEN=xxx ./scripts/fix-vercel-nhost-env.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

CORRECT_SUBDOMAIN="mthatsgmfklegprnulnn"
VERCEL_CMD="npx vercel"

if [ -n "$VERCEL_TOKEN" ]; then
  export VERCEL_TOKEN
  VERCEL_CMD="$VERCEL_CMD --token $VERCEL_TOKEN"
fi

echo "=== Vercel: VITE_NHOST_SUBDOMAIN auf $CORRECT_SUBDOMAIN setzen ==="

echo "Environment: production"
$VERCEL_CMD env rm VITE_NHOST_SUBDOMAIN production --yes 2>/dev/null || true
$VERCEL_CMD env add VITE_NHOST_SUBDOMAIN production --value "$CORRECT_SUBDOMAIN" --yes

echo "Environment: preview (alle Branches)"
$VERCEL_CMD env rm VITE_NHOST_SUBDOMAIN preview --yes 2>/dev/null || true
if $VERCEL_CMD env add VITE_NHOST_SUBDOMAIN preview --value "$CORRECT_SUBDOMAIN" --yes 2>/dev/null; then
  echo "Preview: gesetzt (alle Branches)."
else
  echo "Preview (alle): nicht möglich ohne Branch – setze für einzelne Branches…"
  PREVIEW_BRANCHES=""
  if git rev-parse --git-dir >/dev/null 2>&1; then
    PREVIEW_BRANCHES=$(git branch -a 2>/dev/null | sed 's/^[* ]*//;s|remotes/origin/||' | grep -v '^main$' | grep -v 'HEAD' | sort -u)
  fi
  for branch in $PREVIEW_BRANCHES; do
    [ -z "$branch" ] && continue
    if $VERCEL_CMD env add VITE_NHOST_SUBDOMAIN preview "$branch" --value "$CORRECT_SUBDOMAIN" --yes 2>/dev/null; then
      echo "  Preview ($branch): gesetzt."
    fi
  done
  if [ -z "$PREVIEW_BRANCHES" ]; then
    echo "  Kein weiterer Branch außer main – ggf. im Dashboard unter Settings → Environment Variables für Preview setzen."
  fi
fi

echo ""
echo "=== Production-Redeploy auslösen ==="
$VERCEL_CMD --prod --force

echo ""
echo "Fertig. Nach dem Deploy sollte der Login mit der richtigen Auth-URL funktionieren."
