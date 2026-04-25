#!/usr/bin/env bash
set -euo pipefail
# Shared helper: collects changed files for shimwrappercheck scopes.
# Usage: source this file, then call collect_changed_files.
# Depends on: GIT_CMD (defaults to git), SHIM_CHANGED_FILES, SHIM_CHANGED_FILES_FILE.

GIT_CMD="${GIT_CMD:-/usr/bin/git}"
if [[ ! -x "$GIT_CMD" ]]; then
  GIT_CMD="git"
fi

collect_changed_files() {
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
    if "$GIT_CMD" rev-parse --verify origin/main >/dev/null 2>&1; then
      "$GIT_CMD" diff --name-only --diff-filter=ACMR origin/main...HEAD 2>/dev/null || true
    fi
  } | sort -u
}
