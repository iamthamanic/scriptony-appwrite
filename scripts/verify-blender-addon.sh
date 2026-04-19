#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
LEGACY_ZIP="$ROOT_DIR/scriptony_blender_addon.zip"
EXTENSION_ZIP="$ROOT_DIR/scriptony_blender_extension.zip"
SMOKE_SCRIPT="$ROOT_DIR/scripts/blender-addon-smoke-test.py"

fail() {
  echo "Blender add-on verification failed: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

assert_zip_contents() {
  local zip_path="$1"
  shift

  local actual_output
  local expected_output

  actual_output=$(zipinfo -1 "$zip_path")
  expected_output=$(printf '%s\n' "$@")

  if [[ "$actual_output" != "$expected_output" ]]; then
    fail "Unexpected ZIP structure in $(basename "$zip_path")"
  fi
}

assert_zip_contains() {
  local zip_path="$1"
  local archived_path="$2"
  local pattern="$3"

  if ! unzip -p "$zip_path" "$archived_path" | grep -q "$pattern"; then
    fail "Expected pattern '$pattern' in $archived_path from $(basename "$zip_path")"
  fi
}

assert_zip_not_contains() {
  local zip_path="$1"
  local archived_path="$2"
  local pattern="$3"

  if unzip -p "$zip_path" "$archived_path" | grep -q "$pattern"; then
    fail "Unexpected pattern '$pattern' in $archived_path from $(basename "$zip_path")"
  fi
}

find_blender_bin() {
  if [[ -n "${BLENDER_BIN:-}" ]]; then
    echo "$BLENDER_BIN"
    return 0
  fi
  if [[ -x "/Applications/Blender.app/Contents/MacOS/Blender" ]]; then
    echo "/Applications/Blender.app/Contents/MacOS/Blender"
    return 0
  fi
  if command -v blender >/dev/null 2>&1; then
    command -v blender
    return 0
  fi
  return 1
}

require_command zipinfo
require_command unzip
require_command grep

"$ROOT_DIR/scripts/build-blender-addon.sh" all

assert_zip_contents "$LEGACY_ZIP" \
  "scriptony_blender_addon/__init__.py" \
  "scriptony_blender_addon/api.py" \
  "scriptony_blender_addon/constants.py" \
  "scriptony_blender_addon/operators.py" \
  "scriptony_blender_addon/server.py" \
  "scriptony_blender_addon/ui.py"

assert_zip_contents "$EXTENSION_ZIP" \
  "__init__.py" \
  "api.py" \
  "constants.py" \
  "operators.py" \
  "server.py" \
  "ui.py" \
  "blender_manifest.toml"

assert_zip_contains "$LEGACY_ZIP" "scriptony_blender_addon/__init__.py" "bl_info = {"
assert_zip_not_contains "$EXTENSION_ZIP" "__init__.py" "bl_info = {"
assert_zip_contains "$EXTENSION_ZIP" "blender_manifest.toml" 'id = "scriptony_blender_addon"'
assert_zip_contains "$EXTENSION_ZIP" "blender_manifest.toml" 'blender_version_min = "4.2.0"'

if [[ "${RUN_BLENDER_SMOKE:-0}" == "1" || -n "${BLENDER_BIN:-}" ]]; then
  if BLENDER_PATH=$(find_blender_bin); then
    "$BLENDER_PATH" --factory-startup --background --python "$SMOKE_SCRIPT" -- "$ROOT_DIR"
  else
    fail "RUN_BLENDER_SMOKE was requested, but no Blender binary was found"
  fi
else
  echo "Skipping Blender runtime smoke test. Set RUN_BLENDER_SMOKE=1 or BLENDER_BIN=/path/to/Blender to enable it."
fi

echo "Blender add-on verification passed."
