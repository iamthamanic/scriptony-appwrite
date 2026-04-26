#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v codex >/dev/null 2>&1; then
  echo "Skipping AI review: Codex CLI not available." >&2
  exit 0
fi

GIT_CMD="${GIT_CMD:-/usr/bin/git}"
if [[ ! -x "$GIT_CMD" ]]; then
  GIT_CMD="git"
fi

REVIEWS_DIR="${SHIM_AI_REVIEW_DIR:-.shimwrapper/reviews}"
mkdir -p "$REVIEWS_DIR"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

collect_scoped_files() {
  if [[ -n "${SHIM_CHANGED_FILES:-}" ]]; then
    printf '%s\n' "$SHIM_CHANGED_FILES" | tr ',' '\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | grep -v '^$'
    return 0
  fi

  if [[ -n "${SHIM_CHANGED_FILES_FILE:-}" ]] && [[ -f "$SHIM_CHANGED_FILES_FILE" ]]; then
    sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' "$SHIM_CHANGED_FILES_FILE" | grep -v '^$'
    return 0
  fi

  {
    "$GIT_CMD" diff --name-only --diff-filter=ACMR 2>/dev/null || true
    "$GIT_CMD" diff --name-only --cached --diff-filter=ACMR 2>/dev/null || true
    "$GIT_CMD" ls-files --others --exclude-standard 2>/dev/null || true
  } | sort -u
}

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

Pruefe nur den bereitgestellten Diff. Ignoriere nicht enthaltene Altlasten.

Bewerte besonders:
- Security, Secrets, Auth, Permissions
- SOLID/SRP/DRY/KISS
- Runtime-Kompatibilitaet
- Tests und Verifizierbarkeit
- Breaking Changes
- UI/UX-Regeln, falls UI betroffen ist

Antworte kurz im folgenden Format:

VERDICT: ACCEPT oder REJECT
FINDINGS:
- severity: file:line - problem - required fix

Wenn es keine blockierenden Findings gibt, nutze VERDICT: ACCEPT.

--- DIFF ---
PROMPT

cat "$DIFF_FILE" >> "$PROMPT_FILE"

echo "Running Codex AI review with scoped diff..."
if ! codex exec -C "$ROOT_DIR" --skip-git-repo-check --ephemeral --sandbox read-only --color never -o "$REVIEW_FILE" - < "$PROMPT_FILE"; then
  echo "Codex AI review command failed." >&2
  exit 1
fi

cat "$REVIEW_FILE"

if grep -qi '^VERDICT:[[:space:]]*REJECT' "$REVIEW_FILE"; then
  echo "AI review rejected the diff." >&2
  exit 1
fi

if ! grep -qi '^VERDICT:[[:space:]]*ACCEPT' "$REVIEW_FILE"; then
  echo "AI review did not provide an ACCEPT verdict." >&2
  exit 1
fi
