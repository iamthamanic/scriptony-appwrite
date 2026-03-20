#!/usr/bin/env bash
# Override public DNS (often 127.0.0.1 for *.local.nhost.run) so your Mac talks to your VPS.
#
#   cd /path/to/Scriptonyapp
#   sudo bash scripts/macos-override-nhost-local-hosts.sh 72.61.84.64
#   sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
#   ping -c 1 local.auth.local.nhost.run
set -euo pipefail

IP="${1:-}"
if [[ -z "$IP" ]]; then
  echo "Usage: sudo bash $0 <VPS_IPV4>" >&2
  exit 1
fi
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Must run as root: sudo bash $0 $IP" >&2
  exit 1
fi

export SCRIPTONY_VPS_IP="$IP"
python3 << 'PY'
from pathlib import Path
import os

ip = os.environ["SCRIPTONY_VPS_IP"]
path = Path("/etc/hosts")
begin, end = "# SCRIPTONY_NHOST_OVERRIDE_BEGIN", "# SCRIPTONY_NHOST_OVERRIDE_END"
hosts = (
    "local.auth.local.nhost.run local.dashboard.local.nhost.run "
    "local.graphql.local.nhost.run local.functions.local.nhost.run "
    "local.storage.local.nhost.run local.mailhog.local.nhost.run "
    "local.db.local.nhost.run"
)
line = f"{ip}  {hosts}"
text = path.read_text()
if begin in text:
    pre, _, rest = text.partition(begin)
    _, _, post = rest.partition(end)
    text = pre + post
out = []
for ln in text.splitlines():
    if "local.auth.local.nhost.run" in ln and ln.strip().startswith("127.0.0.1"):
        continue
    if "local.auth.local.nhost.run" in ln and ln.strip().startswith("::1"):
        continue
    out.append(ln)
text = "\n".join(out).rstrip() + "\n\n" + begin + "\n" + line + "\n" + end + "\n"
path.write_text(text)
print("Updated /etc/hosts")
PY

echo "Flush: sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder"
echo "Test:  ping -c 1 local.auth.local.nhost.run"
