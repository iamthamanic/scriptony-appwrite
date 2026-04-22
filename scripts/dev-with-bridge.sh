#!/usr/bin/env bash
# scripts/dev-with-bridge.sh — Start Scriptony with bridge + service checks
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
COMPOSE_CMD=(docker compose --env-file infra/appwrite/.env)

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Scriptony Dev-Stack wird gestartet    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"

# 1. Check Appwrite env
if [ ! -f infra/appwrite/.env ]; then
  echo -e "${YELLOW}⚠  infra/appwrite/.env fehlt${NC}"
  echo -e "   Kopiere Template: ${CYAN}cp infra/appwrite/.env.example infra/appwrite/.env${NC}"
  cp infra/appwrite/.env.example infra/appwrite/.env
  echo -e "${GREEN}✓  .env erstellt (Defaults übernommen)${NC}"
fi

# 2. Start Appwrite + Bridge via Docker Compose
echo ""
echo -e "${CYAN}▸ Docker Compose-Konfiguration prüfen...${NC}"
if ! "${COMPOSE_CMD[@]}" config > /dev/null; then
  echo -e "${RED}✗  Docker Compose-Konfiguration ist ungültig${NC}"
  echo -e "   Prüfe ${CYAN}docker-compose.yml${NC} und ${CYAN}infra/appwrite/docker-compose.yml${NC}"
  exit 1
fi
echo -e "${GREEN}✓  Docker Compose-Konfiguration ist gültig${NC}"

echo ""
echo -e "${CYAN}▸ Docker Compose: Appwrite + Bridge starten...${NC}"
COMPOSE_UP_LOG=$(mktemp)
if ! "${COMPOSE_CMD[@]}" up -d >"$COMPOSE_UP_LOG" 2>&1; then
  tail -20 "$COMPOSE_UP_LOG"
  rm -f "$COMPOSE_UP_LOG"
  echo -e "${RED}✗  Docker Compose-Start fehlgeschlagen${NC}"
  exit 1
fi
tail -5 "$COMPOSE_UP_LOG"
rm -f "$COMPOSE_UP_LOG"

# 3. Wait for bridge to be reachable (up to 30s)
echo ""
echo -e "${CYAN}▸ Bridge erreichbarkeit prüfen...${NC}"
BRIDGE_OK=false
for _ in $(seq 1 15); do
  if curl -sf http://localhost:9877/health > /dev/null 2>&1; then
    BRIDGE_OK=true
    break
  fi
  sleep 2
done

if [ "$BRIDGE_OK" = true ]; then
  # shellcheck disable=SC2034
  BRIDGE_JSON="$(curl -sf http://localhost:9877/health 2>/dev/null || echo '{}')"
  echo -e "${GREEN}✓  Bridge erreichbar auf Port 9877${NC}"
else
  echo -e "${RED}✗  Bridge nicht erreichbar (noch beim Starten?)${NC}"
fi

# 4. Check ComfyUI
echo ""
echo -e "${CYAN}▸ ComfyUI prüfen (localhost:8188)...${NC}"
if curl -sf http://localhost:8188/system_stats > /dev/null 2>&1; then
  echo -e "${GREEN}✓  ComfyUI erreichbar${NC}"
else
  echo -e "${YELLOW}⚠  ComfyUI nicht erreichbar${NC}"
  echo -e "   ComfyUI muss manuell gestartet werden:"
  echo -e "   ${CYAN}cd /path/to/ComfyUI && python main.py${NC}"
fi

# 5. Check Blender Addon
echo ""
echo -e "${CYAN}▸ Blender Addon prüfen (localhost:9876)...${NC}"
if curl -sf http://localhost:9876/health > /dev/null 2>&1; then
  BLENDER_JSON=$(curl -sf http://localhost:9876/health 2>/dev/null || echo '{}')
  echo -e "${GREEN}✓  Blender Addon erreichbar${NC}"
  echo -e "   ${BLENDER_JSON}"
else
  echo -e "${YELLOW}⚠  Blender Addon nicht erkannt${NC}"
  echo -e "   Blender mit Scriptony-Addon starten:"
  echo -e "   ${CYAN}1. Blender öffnen → Edit → Preferences → Add-ons${NC}"
  echo -e "   ${CYAN}2. ZIP bauen: npm run addon:zip${NC}"
  echo -e "   ${CYAN}3. Install... → scriptony_blender_addon.zip auswählen${NC}"
  echo -e "   ${CYAN}4. Sidebar (N) → Scriptony Panel${NC}"
fi

# 6. Check Appwrite
echo ""
echo -e "${CYAN}▸ Appwrite prüfen (localhost:8080)...${NC}"
if curl -sf http://localhost:8080/v1/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓  Appwrite erreichbar${NC}"
else
  echo -e "${YELLOW}⚠  Appwrite noch nicht erreichbar (Docker startet noch...)${NC}"
fi

# 7. Summary
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              Status-Übersicht            ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════╣${NC}"

BRIDGE_STATUS="✗"
[ "$BRIDGE_OK" = true ] && BRIDGE_STATUS="✓"

COMFYUI_STATUS="✗"
curl -sf http://localhost:8188/system_stats > /dev/null 2>&1 && COMFYUI_STATUS="✓"

BLENDER_STATUS="✗"
curl -sf http://localhost:9876/health > /dev/null 2>&1 && BLENDER_STATUS="✓"

APPWRITE_STATUS="✗"
curl -sf http://localhost:8080/v1/health > /dev/null 2>&1 && APPWRITE_STATUS="✓"

echo -e "║  Appwrite:  ${APPWRITE_STATUS}  (localhost:8080)            ║"
echo -e "║  Bridge:    ${BRIDGE_STATUS}  (localhost:9877)            ║"
echo -e "║  ComfyUI:   ${COMFYUI_STATUS}  (localhost:8188)            ║"
echo -e "║  Blender:   ${BLENDER_STATUS}  (localhost:9876)            ║"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

if [ "$BRIDGE_OK" = true ]; then
  echo -e "  Bridge Health: ${CYAN}http://localhost:9877/health${NC}"
  echo -e "  Bridge Config: ${CYAN}http://localhost:9877/bridge/config${NC}"
  echo ""
fi

# 8. Start Vite dev server
echo -e "${CYAN}▸ Vite Dev Server starten...${NC}"
echo ""
npx vite
