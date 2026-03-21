#!/usr/bin/env bash
# Read-only overview of a Linux host (run ON THE SERVER via SSH).
# Paste the full output into a chat so maintainers can see the current state.
# Usage: bash server-snapshot.sh   (from any directory)
set -euo pipefail

echo "========== SERVER SNAPSHOT $(date -u +%Y-%m-%dT%H:%M:%SZ) =========="
echo
echo "=== uname / uptime ==="
uname -a 2>/dev/null || true
uptime 2>/dev/null || true
echo
echo "=== OS release ==="
cat /etc/os-release 2>/dev/null || true
echo
echo "=== disk ==="
df -hT 2>/dev/null || true
echo
echo "=== memory ==="
free -h 2>/dev/null || true
echo
echo "=== listening TCP ports (no root may hide PIDs) ==="
ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || true
echo
echo "=== docker (if installed) ==="
command -v docker >/dev/null 2>&1 && {
  docker version 2>/dev/null | head -20 || true
  echo "--- docker ps -a ---"
  docker ps -a 2>/dev/null || true
  echo "--- docker compose ls ---"
  docker compose ls 2>/dev/null || true
} || echo "(docker not in PATH)"
echo
echo "=== common project paths (if present) ==="
for d in /root/scriptony-prod /root/scriptony-test ~/nhost-upstream ~/nhost /opt/nhost /var/www; do
  if [[ -d "$d" ]]; then
    echo "[dir] $d"
    ls -la "$d" 2>/dev/null | head -25
    echo
  fi
done
echo "=== nginx sites-enabled (if any) ==="
if [[ -d /etc/nginx/sites-enabled ]]; then
  ls -la /etc/nginx/sites-enabled 2>/dev/null || true
elif [[ -d /etc/nginx/conf.d ]]; then
  ls -la /etc/nginx/conf.d 2>/dev/null | true
else
  echo "(no standard nginx path)"
fi
echo
echo "=== caddy (if any) ==="
if command -v caddy >/dev/null 2>&1; then
  caddy version 2>/dev/null || true
  [[ -f /etc/caddy/Caddyfile ]] && echo "--- /etc/caddy/Caddyfile (first 80 lines) ---" && head -80 /etc/caddy/Caddyfile
else
  echo "(caddy not in PATH or no Caddyfile checked)"
fi
echo
echo "=== end snapshot ==="
