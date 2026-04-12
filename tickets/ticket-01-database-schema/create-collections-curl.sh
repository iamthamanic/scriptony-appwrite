#!/bin/bash

set -euo pipefail

echo "create-collections-curl.sh is a legacy compatibility shim."
echo "Delegating to ./deploy.sh so the full schema is applied against database 'scriptony'."
echo

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"${SCRIPT_DIR}/deploy.sh" "$@"
