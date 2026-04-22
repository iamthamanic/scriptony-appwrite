---
name: rag-index
description: Index the codebase into LightRAG for semantic RAG search
argument-hint: "[path|--status|--reindex]"
allowed-tools: Bash mcp__lightrag__*
---

# RAG Index Skill

Manage the LightRAG knowledge graph index for semantic code search.

## Arguments

- No arguments or `.` — Index the current project
- `--status` — Check if LightRAG server is running and show index stats
- `--reindex` — Force re-index all files (clears existing index first)
- A path — Index a specific directory

## Steps

### If argument is --status

1. Check LightRAG server status:
   !`bash scripts/rag-start.sh --status`
2. If the server is running, report the number of indexed documents and the index health
3. If the server is not running, tell the user to start it with: `bash scripts/rag-start.sh`

### If argument is --reindex

1. Check if LightRAG server is running:
   !`bash scripts/rag-start.sh --status`
2. If not running, start it:
   !`bash scripts/rag-start.sh`
3. Run the full index with --force flag:
   !`python3 scripts/rag-full-index.py --force --dir "$PROJECT_ROOT"`

### Otherwise (initial or incremental indexing)

1. Check if LightRAG server is running:
   !`bash scripts/rag-start.sh --status`
2. If not running, start it:
   !`bash scripts/rag-start.sh`
3. Run incremental indexing (only new/changed files):
   !`python3 scripts/rag-full-index.py --dir "$PROJECT_ROOT"`
4. Report: number of files scanned, number of new files indexed, total documents in index

## How to Use the RAG Index

After indexing, you can query the knowledge graph using the LightRAG MCP tools:

- `mcp__lightrag__query` — Ask a question about the codebase
- `mcp__lightrag__insert_text` — Manually add content to the index
- `mcp__lightrag__get_graph` — View the knowledge graph structure
- `mcp__lightrag__health_check` — Verify the server is running

When searching for code, prefer using `mcp__lightrag__query` with mode "hybrid" for the best results combining vector similarity and graph traversal.
