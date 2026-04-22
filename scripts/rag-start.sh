#!/bin/bash
# rag-start.sh — Start LightRAG server with Ollama Cloud for codebase RAG
# Usage: ./scripts/rag-start.sh [--install] [--status] [--stop] [--restart]

set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
RAG_DIR="$PROJECT_ROOT/.rag"
RAG_LOG="$RAG_DIR/server.log"
RAG_PORT="${LIGHTRAG_PORT:-9621}"
RAG_URL="http://localhost:$RAG_PORT"
OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
VENV_PYTHON="$RAG_DIR/venv/bin/python"
VENV_BIN="$RAG_DIR/venv/bin"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[rag]${NC} $1"; }
warn() { echo -e "${YELLOW}[rag]${NC} $1"; }
err() { echo -e "${RED}[rag]${NC} $1"; }

mkdir -p "$RAG_DIR"

# --- Default .env for Ollama Cloud ---
ensure_env() {
    if [ ! -f "$RAG_DIR/.env" ]; then
        log "Creating default .env for Ollama Cloud in $RAG_DIR/.env"
        cat > "$RAG_DIR/.env" << 'ENVEOF'
# LightRAG Server — Ollama Cloud Configuration
# ================================
# LLM runs on Ollama Cloud (no local GPU needed)
# Embeddings run locally via Ollama (bge-m3 is tiny, 1.2 GB, 15ms)
# Edit this file to change models. After changing: bash scripts/rag-start.sh --restart

# --- LLM (Ollama Cloud) ---
LLM_BINDING=ollama
LLM_MODEL=glm-5:cloud
LLM_BINDING_HOST=http://localhost:11434
OLLAMA_LLM_NUM_CTX=32768

# --- Embeddings (Ollama local — fast, 1.2 GB, no cloud needed) ---
EMBEDDING_BINDING=ollama
EMBEDDING_MODEL=bge-m3:latest
EMBEDDING_DIM=1024
EMBEDDING_BINDING_HOST=http://localhost:11434
OLLAMA_EMBEDDING_NUM_CTX=8192

# --- Performance ---
MAX_ASYNC=4
MAX_PARALLEL_INSERT=2
TIMEOUT=150
LLM_TIMEOUT=300

# ================================
# Alternative configs (uncomment to switch)
# ================================

# --- Ollama Cloud: qwen3.5 (262k context, great for large codebases) ---
# LLM_MODEL=qwen3.5:cloud
# OLLAMA_LLM_NUM_CTX=65536

# --- Ollama Cloud: deepseek-v3.1 671B (best quality, slower) ---
# LLM_MODEL=deepseek-v3.1:671b:cloud
# OLLAMA_LLM_NUM_CTX=32768

# --- Ollama Local: qwen2.5-coder 7B (offline, needs 8GB RAM) ---
# LLM_MODEL=qwen2.5-coder:7b
# OLLAMA_LLM_NUM_CTX=32768

# --- OpenAI (fastest, costs money) ---
# LLM_BINDING=openai
# LLM_MODEL=gpt-4o-mini
# LLM_BINDING_HOST=https://api.openai.com/v1
# LLM_BINDING_API_KEY=sk-your-key-here
ENVEOF
    fi
}

# --- Install into venv ---
install_lightrag() {
    if [ -f "$VENV_PYTHON" ] && "$VENV_PYTHON" -c "import lightrag" &>/dev/null; then
        log "LightRAG already installed in venv: $("$VENV_PYTHON" -c "import lightrag; print(lightrag.__version__)" 2>/dev/null || echo 'unknown')"
        return 0
    fi

    log "Creating venv and installing LightRAG..."
    mkdir -p "$RAG_DIR"
    uv venv "$RAG_DIR/venv" --python 3.12
    uv pip install --python "$RAG_DIR/venv/bin/python" "lightrag-hku[api]" "ollama" || {
        err "Failed to install LightRAG."
        echo "  Try: uv venv $RAG_DIR/venv --python 3.12 && uv pip install --python $RAG_DIR/venv/bin/python 'lightrag-hku[api]'"
        exit 1
    }
    log "LightRAG installed: $("$VENV_PYTHON" -c "import lightrag; print(lightrag.__version__)" 2>/dev/null)"
}

# --- Ensure Ollama models are available ---
ensure_ollama_models() {
    if ! command -v ollama &>/dev/null; then
        err "Ollama not found. Install it from https://ollama.ai"
        exit 1
    fi

    # Check if Ollama is running
    if ! curl -s --max-time 3 "$OLLAMA_HOST/api/tags" &>/dev/null; then
        err "Ollama is not running at $OLLAMA_HOST"
        echo "  Start it with: open -a Ollama  (or: ollama serve)"
        exit 1
    fi

    # Check for embedding model (bge-m3 — local, tiny)
    # Note: ollama list may show "bge-m3:latest" — use -i for case-insensitive match
    if ! ollama list 2>/dev/null | grep -iq "bge-m3"; then
        warn "bge-m3 embedding model not found. Pulling (1.2 GB)..."
        ollama pull bge-m3
    fi

    # Check for LLM model from .env
    local llm_model
    llm_model=$(grep -E "^LLM_MODEL=" "$RAG_DIR/.env" 2>/dev/null | cut -d= -f2 || echo "glm-5:cloud")
    # Cloud models show as "-" in size, local models show size
    if ! ollama list 2>/dev/null | grep -q "${llm_model%%:*}"; then
        warn "$llm_model not found locally. Pulling..."
        ollama pull "$llm_model" || {
            warn "Could not pull $llm_model. If it's a cloud model, make sure you're signed in:"
            echo "  ollama signin"
        }
    fi
}

# --- Status ---
check_status() {
    if curl -s --max-time 3 "$RAG_URL/health" &>/dev/null; then
        log "LightRAG server is running on port $RAG_PORT"
        # Show config
        local llm_model embed_model
        llm_model=$(grep -E '^LLM_MODEL=' "$RAG_DIR/.env" 2>/dev/null | cut -d= -f2 || echo "?")
        embed_model=$(grep -E '^EMBEDDING_MODEL=' "$RAG_DIR/.env" 2>/dev/null | cut -d= -f2 || echo "?")
        log "  LLM:       $llm_model"
        log "  Embedding:  $embed_model"
        return 0
    else
        warn "LightRAG server is NOT running on port $RAG_PORT"
        echo "  Start it with: bash scripts/rag-start.sh"
        return 1
    fi
}

# --- Start ---
start_server() {
    # Check if already running
    if curl -s --max-time 3 "$RAG_URL/health" &>/dev/null; then
        log "LightRAG server already running on port $RAG_PORT"
        return 0
    fi

    # Check if installed in venv
    if [ ! -f "$VENV_PYTHON" ] || ! "$VENV_PYTHON" -c "import lightrag" &>/dev/null; then
        warn "LightRAG not installed. Installing now..."
        install_lightrag
    fi

    # Ensure .env config exists
    ensure_env

    # Ensure Ollama models are available
    ensure_ollama_models

    local llm_model embed_model
    llm_model=$(grep -E '^LLM_MODEL=' "$RAG_DIR/.env" | cut -d= -f2)
    embed_model=$(grep -E '^EMBEDDING_MODEL=' "$RAG_DIR/.env" | cut -d= -f2)

    log "Starting LightRAG server on port $RAG_PORT..."
    log "  LLM:       $llm_model (Ollama Cloud)"
    log "  Embedding:  $embed_model (local)"
    log "  Working dir: $RAG_DIR"
    log "  Log file:    $RAG_LOG"

    # Start server in background with .env loaded
    (
        cd "$RAG_DIR"
        set -a
        # shellcheck source=/dev/null
        source .env
        set +a
        "$VENV_BIN/lightrag-server" \
            --port "$RAG_PORT" \
            --working-dir "$RAG_DIR" \
            --llm-binding ollama \
            --embedding-binding ollama \
            >> "$RAG_LOG" 2>&1 &
        echo $! > "$RAG_DIR/server.pid"
    )

    local pid
    pid=$(cat "$RAG_DIR/server.pid" 2>/dev/null || echo "unknown")
    log "Server PID: $pid"

    # Wait for server to be ready
    log "Waiting for server to start (Ollama Cloud models may take a moment on first request)..."
    local attempts=0
    while [ $attempts -lt 90 ]; do
        if curl -s --max-time 2 "$RAG_URL/health" &>/dev/null; then
            log "Server is ready at $RAG_URL"
            return 0
        fi
        sleep 1
        attempts=$((attempts + 1))
        [ $((attempts % 15)) -eq 0 ] && log "  Still waiting... ($attempts s)"
    done

    err "Server failed to start within 90 seconds. Check logs: $RAG_LOG"
    tail -30 "$RAG_LOG" 2>/dev/null
    exit 1
}

# --- Stop ---
stop_server() {
    if [ -f "$RAG_DIR/server.pid" ]; then
        local pid
        pid=$(cat "$RAG_DIR/server.pid")
        if kill -0 "$pid" 2>/dev/null; then
            log "Stopping LightRAG server (PID: $pid)..."
            if ! kill "$pid" 2>/dev/null; then
                warn "Failed to send SIGTERM to PID $pid"
            fi
            rm -f "$RAG_DIR/server.pid"
            log "Server stopped."
        else
            warn "Server PID $pid not running. Cleaning up."
            rm -f "$RAG_DIR/server.pid"
        fi
    else
        warn "No PID file found. Trying to kill any process on port $RAG_PORT..."
        lsof -ti :"$RAG_PORT" | xargs kill 2>/dev/null || warn "No process found on port $RAG_PORT"
    fi
}

# --- Main ---
case "${1:-}" in
    --install)
        install_lightrag
        ;;
    --status)
        check_status
        ;;
    --stop)
        stop_server
        ;;
    --restart)
        stop_server
        sleep 2
        start_server
        ;;
    --start|*)
        start_server
        ;;
esac