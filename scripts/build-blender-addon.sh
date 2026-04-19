#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
PUBLIC_DIR="$ROOT_DIR/public"
LEGACY_SOURCE_DIR="$ROOT_DIR/scriptony_blender_addon"
EXTENSION_MANIFEST="$ROOT_DIR/blender-extension/blender_manifest.toml"

LEGACY_ZIP="$ROOT_DIR/scriptony_blender_addon.zip"
LEGACY_COMPAT_ZIP="$ROOT_DIR/scriptony-blender-addon.zip"
EXTENSION_ZIP="$ROOT_DIR/scriptony_blender_extension.zip"

MODE="${1:-all}"
ADDON_FILES=(
  "__init__.py"
  "api.py"
  "constants.py"
  "operators.py"
  "server.py"
  "ui.py"
)

usage() {
  cat <<'EOF'
Usage: scripts/build-blender-addon.sh [legacy|extension|all]

Builds:
  scriptony_blender_addon.zip
  scriptony_blender_extension.zip
EOF
}

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing required file: $path" >&2
    exit 1
  fi
}

build_legacy_zip() {
  mkdir -p "$PUBLIC_DIR"

  python3 - "$LEGACY_SOURCE_DIR" "$LEGACY_ZIP" "${ADDON_FILES[@]}" <<'PY'
import pathlib
import sys
import zipfile

source_dir = pathlib.Path(sys.argv[1])
output_path = pathlib.Path(sys.argv[2])
files = sys.argv[3:]
timestamp = (2024, 1, 1, 0, 0, 0)

with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for relative_path in files:
        file_path = source_dir / relative_path
        if not file_path.is_file():
            raise SystemExit(f"Missing required addon file: {file_path}")

        info = zipfile.ZipInfo(f"{source_dir.name}/{relative_path}", date_time=timestamp)
        info.compress_type = zipfile.ZIP_DEFLATED
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        archive.writestr(info, file_path.read_bytes())
PY

  cp "$LEGACY_ZIP" "$PUBLIC_DIR/$(basename "$LEGACY_ZIP")"
  cp "$LEGACY_ZIP" "$LEGACY_COMPAT_ZIP"
  cp "$LEGACY_ZIP" "$PUBLIC_DIR/scriptony-blender-addon.zip"
  echo "Built legacy ZIP: $LEGACY_ZIP"
  echo "Updated legacy alias: $LEGACY_COMPAT_ZIP"
}

build_extension_zip() {
  require_file "$EXTENSION_MANIFEST"
  mkdir -p "$PUBLIC_DIR"

  local tmp_dir
  tmp_dir=$(mktemp -d)
  trap 'rm -rf "$tmp_dir"' RETURN

  local staging_dir="$tmp_dir/extension-source"
  mkdir -p "$staging_dir"

  for relative_path in "${ADDON_FILES[@]}"; do
    cp "$LEGACY_SOURCE_DIR/$relative_path" "$staging_dir/$relative_path"
  done
  cp "$EXTENSION_MANIFEST" "$staging_dir/blender_manifest.toml"

  python3 - "$staging_dir/__init__.py" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
begin = "# BEGIN_LEGACY_BL_INFO\n"
end = "# END_LEGACY_BL_INFO\n"

start = text.find(begin)
finish = text.find(end)
if start == -1 or finish == -1 or finish < start:
    raise SystemExit("Could not locate legacy bl_info block markers in __init__.py")

finish += len(end)
path.write_text(text[:start] + text[finish:], encoding="utf-8")
PY

  python3 - "$staging_dir" "$EXTENSION_ZIP" <<'PY'
import pathlib
import sys
import zipfile

source_dir = pathlib.Path(sys.argv[1])
output_path = pathlib.Path(sys.argv[2])
timestamp = (2024, 1, 1, 0, 0, 0)

required = [
    "__init__.py",
    "api.py",
    "constants.py",
    "operators.py",
    "server.py",
    "ui.py",
    "blender_manifest.toml",
]

with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for relative_path in required:
        file_path = source_dir / relative_path
        if not file_path.is_file():
            raise SystemExit(f"Missing required extension file: {file_path}")

        info = zipfile.ZipInfo(relative_path, date_time=timestamp)
        info.compress_type = zipfile.ZIP_DEFLATED
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        archive.writestr(info, file_path.read_bytes())
PY

  cp "$EXTENSION_ZIP" "$PUBLIC_DIR/$(basename "$EXTENSION_ZIP")"
  echo "Built extension ZIP: $EXTENSION_ZIP"
}

for relative_path in "${ADDON_FILES[@]}"; do
  require_file "$LEGACY_SOURCE_DIR/$relative_path"
done

case "$MODE" in
  legacy)
    build_legacy_zip
    ;;
  extension)
    build_extension_zip
    ;;
  all)
    build_legacy_zip
    build_extension_zip
    ;;
  *)
    usage
    exit 1
    ;;
esac
