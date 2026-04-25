#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
OLLAMA_MODEL="${SHIM_OLLAMA_MODEL:-kimi-k2.6:cloud}"
REQUEST_TIMEOUT="${SHIM_AI_TIMEOUT_SEC:-300}"

if ! command -v curl >/dev/null 2>&1; then
  echo "Skipping AI review: curl not available." >&2
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Skipping AI review: jq not available." >&2
  exit 0
fi

# Probe Ollama health
if ! curl -fsS "$OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
  echo "Ollama not reachable at $OLLAMA_HOST" >&2
  exit 77
fi

GIT_CMD="${GIT_CMD:-/usr/bin/git}"
if [[ ! -x "$GIT_CMD" ]]; then
  GIT_CMD="git"
fi

# Source shared changed-files helper
source "$ROOT_DIR/scripts/_shared/collect-changed-files.sh"

collect_scoped_files() {
  collect_changed_files
}

REVIEWS_DIR="${SHIM_AI_REVIEW_DIR:-.shimwrapper/reviews}"
mkdir -p "$REVIEWS_DIR"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

DIFF_FILE="${AI_REVIEW_DIFF_FILE:-$TMP_DIR/ai-review.diff}"
if [[ -z "${AI_REVIEW_DIFF_FILE:-}" ]]; then
  while IFS= read -r file_path; do
    [[ -z "$file_path" ]] && continue
    if "$GIT_CMD" ls-files --error-unmatch "$file_path" >/dev/null 2>&1; then
      "$GIT_CMD" diff --no-color -- "$file_path" >> "$DIFF_FILE" || true
      "$GIT_CMD" diff --cached --no-color -- "$file_path" >> "$DIFF_FILE" || true
    elif [[ -f "$file_path" ]]; then
      "$GIT_CMD" diff --no-index --no-color /dev/null "$file_path" >> "$DIFF_FILE" 2>/dev/null || true
    fi
  done < <(collect_scoped_files)
fi

if [[ ! -s "$DIFF_FILE" ]]; then
  echo "Skipping AI review: no scoped diff found."
  exit 0
fi

PROMPT_FILE="$TMP_DIR/ai-review-prompt.md"
REVIEW_FILE="$REVIEWS_DIR/review-snippet-$(date +%Y%m%d-%H%M%S).md"

cat > "$PROMPT_FILE" <<'PROMPT'
Du bist ein strenger Senior-Software-Architekt und fuehrst ein Code Review auf einem Diff aus.

Projekt-Stack:
- Frontend: React 18+ + Vite + TypeScript (strict) + Tailwind CSS + Radix UI primitives
- Backend: Node.js Appwrite Edge Functions mit Hono framework (kein Deno)
- Estado: TanStack React Query fuer Server-State
- API: Appwrite SDK (keine raw fetch/Axios-Aufrufe an Appwrite in Components)
- Styling: Tailwind utility classes, keine hardcoded Colors (#hex), Theme-Variablen nutzen
- Accessibility: Semantic HTML, aria-label fuer icon-only Buttons, keyboard navigation

Projekt-Regeln (verletzung = Finding):
- Max 300 Zeilen pro File, max 150 Zeilen pro Component. Aufteilen wenn zu gross.
- Keine Business-Logic in Components / Pages → in Hooks (src/hooks/) oder Services.
- Kein `any` in TypeScript. `unknown` + Type-Guard wenn noetig.
- Appwrite Functions duerfen NICHT aus anderen Function-Modulen importieren. Shared Code nur ueber functions/_shared/.
- Input-Validierung in Appwrite Functions mit Zod.
- Keine hardcoded Secrets/API-Keys. Environment-Variablen via Appwrite Function env.
- Error-Handling: Loading/Error States in UI, sonner fuer Toasts. Niemals Errors schlucken.
- Tests: Vitest (Frontend), Deno-Test wo anwendbar (Backend). Business-Logic testen, nicht UI-Boilerplate.

Pruefe nur den bereitgestellten Diff. Ignoriere nicht enthaltene Altlasten.

Bewerte besonders:
- Security, Secrets, Auth, Permissions
- SOLID/SRP/DRY/KISS
- Runtime-Kompatibilitaet (Node.js Appwrite Functions, Browser-Frontend)
- Tests und Verifizierbarkeit
- Breaking Changes
- UI/UX-Regeln, falls UI betroffen ist
- Einhaltung der Projekt-Regeln oben

Antworte kurz im folgenden Format:

VERDICT: ACCEPT oder REJECT
FINDINGS:
- severity: file:line - problem - required fix

Wenn es keine blockierenden Findings gibt, nutze VERDICT: ACCEPT.

--- DIFF ---
PROMPT

cat "$DIFF_FILE" >> "$PROMPT_FILE"

echo "Running Ollama AI review with model $OLLAMA_MODEL (timeout ${REQUEST_TIMEOUT}s)..."

# Build JSON payload with jq to avoid ARG_MAX on large diffs
jq -n \
  --arg model "$OLLAMA_MODEL" \
  --rawfile prompt "$PROMPT_FILE" \
  '{model: $model, prompt: $prompt, stream: false}' > "$TMP_DIR/request.json"

HTTP_CODE="$TMP_DIR/http_code.txt"
BODY="$TMP_DIR/body.json"

if ! curl -fsS \
  --max-time "$REQUEST_TIMEOUT" \
  -H "Content-Type: application/json" \
  -d "@$TMP_DIR/request.json" \
  -o "$BODY" \
  -w "%{http_code}" \
  "$OLLAMA_HOST/api/generate" > "$HTTP_CODE"; then
  echo "Ollama AI review request failed (curl error)." >&2
  exit 1
fi

if [[ "$(cat "$HTTP_CODE")" != "200" ]]; then
  echo "Ollama AI review returned HTTP $(cat "$HTTP_CODE")." >&2
  [[ -s "$BODY" ]] && cat "$BODY" >&2
  exit 1
fi

if ! jq -e '.response' "$BODY" >/dev/null 2>&1; then
  echo "Ollama response did not contain expected .response field." >&2
  cat "$BODY" >&2
  exit 1
fi

jq -r '.response' "$BODY" > "$REVIEW_FILE"

# Normalize: strip markdown artifacts, extra whitespace, blank lines for robust VERDICT parsing
NORMALIZED="$TMP_DIR/review-normalized.txt"
sed -E 's/\*\*//g; s/\*//g; s/^[[:space:]]+//; s/[[:space:]]+$//; /^[[:space:]]*$/d' "$REVIEW_FILE" > "$NORMALIZED"

cat "$REVIEW_FILE"

if grep -qiE '^VERDICT[[:space:]]*:[[:space:]]*REJECT' "$NORMALIZED"; then
  echo "AI review rejected the diff." >&2
  exit 1
fi

if ! grep -qiE '^VERDICT[[:space:]]*:[[:space:]]*ACCEPT' "$NORMALIZED"; then
  echo "AI review did not provide an ACCEPT verdict." >&2
  exit 1
fi
