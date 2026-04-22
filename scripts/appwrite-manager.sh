#!/bin/bash
# Appwrite Manager - Hybrid Local/Remote Development Tool
# Kombiniert CLI, MCP und Docker Management

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.local"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║         Appwrite Manager for Scriptony                 ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_help() {
    print_header
    echo -e "${CYAN}Usage:${NC}"
    echo "  ./scripts/appwrite-manager.sh [COMMAND] [OPTIONS]"
    echo ""
    echo -e "${CYAN}Commands:${NC}"
    echo "  status              - Zeigt Status von lokalen und remote Appwrite"
    echo "  switch local        - Wechselt zu lokalem Appwrite (Full Local)"
    echo "  switch hybrid       - Wechselt zu Hybrid (Core local, Functions remote) ★"
    echo "  switch remote       - Wechselt zu remote Appwrite (Full Remote)"
    echo "  start-local         - Startet lokalen Appwrite Docker"
    echo "  stop-local          - Stoppt lokalen Appwrite Docker"
    echo "  restart-local       - Restartet lokalen Appwrite"
    echo "  deploy-all          - Deployed alle Functions zu lokalem Appwrite"
    echo "  deploy [FUNCTION]   - Deployed eine spezifische Function"
    echo "  logs [SERVICE]      - Zeigt Logs eines Services (z.B. appwrite, worker-functions)"
    echo "  mcp-start           - Startet MCP Server für lokales Appwrite"
    echo "  mcp-test            - Testet MCP Verbindung"
    echo "  setup-local         - Erstmalige Einrichtung des lokalen Appwrite"
    echo "  doctor              - Prüft ob alle Tools installiert sind"
    echo ""
    echo -e "${CYAN}Beispiele:${NC}"
    echo "  ./scripts/appwrite-manager.sh switch hybrid"
    echo "  ./scripts/appwrite-manager.sh deploy scriptony-projects"
    echo "  ./scripts/appwrite-manager.sh logs appwrite-worker-functions"
    echo ""
}

check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker nicht erreichbar. Bitte Docker Desktop starten.${NC}"
        exit 1
    fi
}

wait_for_appwrite() {
    echo -e "${YELLOW}⏳ Warte auf Appwrite...${NC}"
    local retries=30
    while [ $retries -gt 0 ]; do
        if curl -s http://localhost:8080/v1/health >/dev/null 2>&1 | grep -q "OK"; then
            echo -e "${GREEN}✅ Appwrite ist bereit!${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        ((retries--))
    done
    echo -e "${RED}❌ Timeout: Appwrite nicht bereit${NC}"
    return 1
}

show_status() {
    print_header
    
    echo -e "${CYAN}Docker Status:${NC}"
    if docker info >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker läuft${NC}"
        local running=$(docker ps --filter "name=appwrite" --format "table {{.Names}}\t{{.Status}}" | wc -l)
        echo "   Appwrite Container: $((running - 1))"
    else
        echo -e "${RED}❌ Docker nicht erreichbar${NC}"
    fi
    echo ""
    
    echo -e "${CYAN}Lokales Appwrite:${NC}"
    if curl -s http://localhost:8080/v1/health >/dev/null 2>&1 | grep -q "OK"; then
        echo -e "${GREEN}✅ Läuft auf http://localhost:8080${NC}"
    else
        echo -e "${RED}❌ Nicht erreichbar${NC}"
    fi
    echo ""
    
    echo -e "${CYAN}Aktuelle .env.local Konfiguration:${NC}"
    local endpoint=$(grep "VITE_APPWRITE_ENDPOINT" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2)
    if [[ "$endpoint" == *"localhost"* ]]; then
        echo -e "   ${GREEN}Lokal/Modus${NC}: $endpoint"
    else
        echo -e "   ${YELLOW}Remote Modus${NC}: $endpoint"
    fi
    echo ""
    
    echo -e "${CYAN}Verfügbare Tools:${NC}"
    which appwrite >/dev/null && echo -e "   ${GREEN}✓${NC} Appwrite CLI ($(appwrite -v))" || echo -e "   ${RED}✗${NC} Appwrite CLI"
    which uvx >/dev/null && echo -e "   ${GREEN}✓${NC} uv/uvx" || echo -e "   ${RED}✗${NC} uv/uvx"
    [ -f ".cursor/mcp.json" ] && echo -e "   ${GREEN}✓${NC} MCP Konfiguration" || echo -e "   ${RED}✗${NC} MCP Konfiguration"
    echo ""
}

switch_mode() {
    local mode=$1
    print_header
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ Keine .env.local gefunden${NC}"
        exit 1
    fi
    
    # Backup aktuelle Config
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    case $mode in
        local)
            echo -e "${YELLOW}🔄 Wechsle zu FULL LOCAL...${NC}"
            sed -i '' 's|VITE_APPWRITE_ENDPOINT=.*|VITE_APPWRITE_ENDPOINT=http://localhost:8080/v1|' "$ENV_FILE"
            sed -i '' 's|VITE_BACKEND_FUNCTION_DOMAIN_MAP=.*|#VITE_BACKEND_FUNCTION_DOMAIN_MAP={}|' "$ENV_FILE"
            echo -e "${GREEN}✅ Auf Lokal umgestellt${NC}"
            echo "   Endpoint: http://localhost:8080/v1"
            echo "   ⚠️  Vergiss nicht: Functions müssen lokal deployed sein!"
            ;;
        hybrid)
            echo -e "${YELLOW}🔄 Wechsle zu HYBRID...${NC}"
            sed -i '' 's|VITE_APPWRITE_ENDPOINT=.*|VITE_APPWRITE_ENDPOINT=http://localhost:8080/v1|' "$ENV_FILE"
            # Behält remote FUNCTION_DOMAIN_MAP bei
            echo -e "${GREEN}✅ Auf Hybrid umgestellt${NC}"
            echo "   Core: http://localhost:8080/v1"
            echo "   Functions: Remote (raccoova.com)"
            echo "   💡 Bestes Setup für Frontend-Entwicklung"
            ;;
        remote)
            echo -e "${YELLOW}🔄 Wechsle zu FULL REMOTE...${NC}"
            sed -i '' 's|VITE_APPWRITE_ENDPOINT=.*|VITE_APPWRITE_ENDPOINT=http://72.61.84.64:8080/v1|' "$ENV_FILE"
            echo -e "${GREEN}✅ Auf Remote umgestellt${NC}"
            echo "   Endpoint: http://72.61.84.64:8080/v1"
            echo "   💡 Kein lokales Docker nötig"
            ;;
        *)
            echo -e "${RED}❌ Ungültiger Modus: $mode${NC}"
            echo "   Erlaubt: local, hybrid, remote"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${CYAN}🔄 Bitte Vite neu starten:${NC}"
    echo "   npm run dev"
}

start_local() {
    print_header
    check_docker
    
    echo -e "${CYAN}▸ Starte lokales Appwrite...${NC}"
    cd "$PROJECT_ROOT/infra/appwrite"
    docker compose up -d
    
    if wait_for_appwrite; then
        echo ""
        echo -e "${GREEN}✅ Lokales Appwrite läuft!${NC}"
        echo -e "   Console: ${CYAN}http://localhost:8080/console${NC}"
        echo -e "   API:     ${CYAN}http://localhost:8080/v1${NC}"
        
        # Check if project exists
        echo ""
        echo -e "${YELLOW}💡 Hinweis:${NC}"
        echo "   Bei erstem Start: Erstelle ein Projekt in der Console"
        echo "   und führe dann './scripts/appwrite-manager.sh setup-local' aus"
    fi
}

stop_local() {
    print_header
    echo -e "${CYAN}▸ Stoppe lokales Appwrite...${NC}"
    cd "$PROJECT_ROOT/infra/appwrite"
    docker compose stop
    echo -e "${GREEN}✅ Appwrite gestoppt${NC}"
}

restart_local() {
    print_header
    stop_local
    echo ""
    start_local
}

deploy_function() {
    local func_name=$1
    print_header
    
    if [ -z "$func_name" ]; then
        echo -e "${RED}❌ Function Name fehlt${NC}"
        echo "   Verwendung: deploy [FUNCTION-NAME]"
        echo "   Beispiel:   deploy scriptony-projects"
        exit 1
    fi
    
    echo -e "${CYAN}▸ Deployed Function: $func_name${NC}"
    
    # Check if function exists
    if [ ! -d "$PROJECT_ROOT/functions/$func_name" ]; then
        echo -e "${RED}❌ Function nicht gefunden: $PROJECT_ROOT/functions/$func_name${NC}"
        exit 1
    fi
    
    # Login to local if not already
    appwrite client --endpoint http://localhost:8080/v1 --self-signed true 2>/dev/null || true
    
    # Deploy
    cd "$PROJECT_ROOT"
    echo -e "${YELLOW}⏳ Baue und deploye... (kann 1-2 Minuten dauern)${NC}"
    
    if npm run appwrite:deploy:$func_name 2>/dev/null; then
        echo -e "${GREEN}✅ $func_name deployed!${NC}"
    else
        # Fallback to direct deploy
        echo "Versuche direkten Deploy..."
        cd "$PROJECT_ROOT/functions/$func_name"
        appwrite push function --id $func_name --force
    fi
}

deploy_all_functions() {
    print_header
    echo -e "${CYAN}▸ Deployed alle Scriptony Functions...${NC}"
    
    local functions=$(ls "$PROJECT_ROOT/functions" | grep "^scriptony-" || true)
    local count=0
    
    for func in $functions; do
        echo ""
        echo -e "${CYAN}[$((++count))] $func${NC}"
        deploy_function "$func" 2>&1 || echo -e "${YELLOW}⚠️  $func übersprungen${NC}"
    done
    
    echo ""
    echo -e "${GREEN}✅ Alle Functions deployed!${NC}"
}

show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        echo -e "${YELLOW}Verfügbare Services:${NC}"
        docker ps --filter "name=appwrite" --format "table {{.Names}}" | tail -n +2
        echo ""
        echo "Verwendung: logs [SERVICE-NAME]"
        exit 1
    fi
    
    echo -e "${CYAN}Zeige Logs für: $service${NC} (Ctrl+C zum beenden)"
    docker logs -f "$service"
}

mcp_test() {
    print_header
    echo -e "${CYAN}▸ Teste MCP Verbindung...${NC}"
    
    # Test MCP Server
    if echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | uvx mcp-server-appwrite --all 2>&1 | head -5; then
        echo -e "${GREEN}✅ MCP Server funktioniert!${NC}"
    else
        echo -e "${RED}❌ MCP Server Test fehlgeschlagen${NC}"
    fi
}

doctor() {
    print_header
    echo -e "${CYAN}Doctor - System Check${NC}"
    echo ""
    
    local issues=0
    
    # Check Docker
    echo -n "Docker: "
    if docker info >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} ($(docker --version))"
    else
        echo -e "${RED}✗ Nicht erreichbar${NC}"
        ((issues++))
    fi
    
    # Check Docker Compose
    echo -n "Docker Compose: "
    if docker compose version >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗ Nicht gefunden${NC}"
        ((issues++))
    fi
    
    # Check Appwrite CLI
    echo -n "Appwrite CLI: "
    if which appwrite >/dev/null; then
        echo -e "${GREEN}✓${NC} ($(appwrite -v 2>&1 | head -1))"
    else
        echo -e "${RED}✗ Nicht installiert${NC}"
        echo "   Installieren: npm install -g appwrite-cli"
        ((issues++))
    fi
    
    # Check uv
    echo -n "uv (Python): "
    if which uv >/dev/null; then
        echo -e "${GREEN}✓${NC} ($(uv --version))"
    else
        echo -e "${RED}✗ Nicht installiert${NC}"
        echo "   Installieren: curl -LsSf https://astral.sh/uv/install.sh | sh"
        ((issues++))
    fi
    
    # Check MCP Server
    echo -n "MCP Server: "
    if uvx mcp-server-appwrite --help >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗ Nicht verfügbar${NC}"
        ((issues++))
    fi
    
    # Check .env
    echo -n ".env.local: "
    if [ -f "$ENV_FILE" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗ Nicht gefunden${NC}"
        ((issues++))
    fi
    
    echo ""
    if [ $issues -eq 0 ]; then
        echo -e "${GREEN}✅ Alle Systeme bereit!${NC}"
    else
        echo -e "${YELLOW}⚠️  $issues Probleme gefunden${NC}"
        exit 1
    fi
}

# Main command handler
case "${1:-help}" in
    status)
        show_status
        ;;
    switch)
        switch_mode "${2:-}"
        ;;
    start-local)
        start_local
        ;;
    stop-local)
        stop_local
        ;;
    restart-local)
        restart_local
        ;;
    deploy)
        deploy_function "${2:-}"
        ;;
    deploy-all)
        deploy_all_functions
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    mcp-test)
        mcp_test
        ;;
    doctor)
        doctor
        ;;
    setup-local)
        echo "Setup-Guide:"
        echo "1. Öffne http://localhost:8080/console"
        echo "2. Erstelle ein Projekt"
        echo "3. Erstelle einen API Key"
        echo "4. Führe './scripts/appwrite-manager.sh doctor' aus"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unbekannter Befehl: $1${NC}"
        show_help
        exit 1
        ;;
esac
