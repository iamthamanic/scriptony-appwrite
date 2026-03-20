#!/usr/bin/env bash
# Creates a Nhost Auth user via POST /v1/signup/email-password (self-hosted or cloud).
# Requires public signup enabled (AUTH_DISABLE_SIGNUP=false / auth.signUp.enabled).
# Usage: ./scripts/nhost-signup-email-password.sh email@domain.com 'YourPassword9+'
# Env: NHOST_AUTH_BASE (default http://local.auth.local.nhost.run/v1)

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <email> <password>" >&2
  echo "  NHOST_AUTH_BASE override example: NHOST_AUTH_BASE=https://auth.project.nhost.run/v1" >&2
  exit 1
fi

EMAIL="$1"
PASSWORD="$2"
BASE="${NHOST_AUTH_BASE:-http://local.auth.local.nhost.run/v1}"
BASE="${BASE%/}"

BODY="$(node -e "
const email = process.argv[1];
const password = process.argv[2];
console.log(JSON.stringify({
  email,
  password,
  options: {
    defaultRole: 'user',
    displayName: email.split('@')[0] || email,
    allowedRoles: ['user', 'me'],
  },
}));
" "$EMAIL" "$PASSWORD")"

echo "POST ${BASE}/signup/email-password"
RESP="$(curl -sS -w "\n%{http_code}" -X POST "${BASE}/signup/email-password" \
  -H "Content-Type: application/json" \
  -d "$BODY")"

CODE="$(echo "$RESP" | tail -n1)"
JSON="$(echo "$RESP" | sed '$d')"
printf '%s\n' "$JSON"

if [[ "$CODE" != "200" ]]; then
  echo "HTTP $CODE" >&2
  exit 1
fi
