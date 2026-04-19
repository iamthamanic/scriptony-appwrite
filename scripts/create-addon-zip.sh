#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

echo "scripts/create-addon-zip.sh is deprecated. Delegating to scripts/build-blender-addon.sh legacy."
"$ROOT_DIR/scripts/build-blender-addon.sh" legacy
