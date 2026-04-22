#!/usr/bin/env python3
"""
rag-reindex.py — Re-index a single file after edit (called by Claude Code PostToolUse hook)

Reads JSON from stdin with format:
{
  "tool_name": "Edit" | "Write",
  "tool_input": {
    "file_path": "/absolute/path/to/file.tsx",
    ...
  }
}

Sends the changed file to LightRAG for incremental re-indexing.
Designed to be called async — exits silently on failure to not block Claude Code.
"""

import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

RAG_URL = "http://localhost:9621"

# Extensions worth re-indexing
INDEXABLE_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx",
    ".py", ".mjs", ".cjs",
    ".md", ".mdx",
    ".json", ".yaml", ".yml", ".toml",
    ".css", ".scss",
    ".html", ".svg",
}


def main():
    try:
        # Read hook input from stdin
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        # No valid input — silent exit
        sys.exit(0)

    tool_name = hook_input.get("tool_name", "")
    tool_input = hook_input.get("tool_input", {})

    # Extract file path
    file_path_str = tool_input.get("file_path", "")
    if not file_path_str:
        sys.exit(0)

    file_path = Path(file_path_str)

    # Only index source files
    if file_path.suffix.lower() not in INDEXABLE_EXTENSIONS:
        sys.exit(0)

    # Skip files that don't exist (deletions)
    if not file_path.exists():
        sys.exit(0)

    # Skip large files
    try:
        if file_path.stat().st_size > 100_000:
            sys.exit(0)
    except OSError:
        sys.exit(0)

    # Read file content
    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        sys.exit(0)

    if not content.strip():
        sys.exit(0)

    # Determine relative path for doc_name
    # Try to make it relative to the project root
    rel_path = file_path.name
    # Walk up to find git root
    current = file_path.parent
    while current != current.parent:
        if (current / ".git").exists():
            rel_path = str(file_path.relative_to(current))
            break
        current = current.parent

    # Add file path header for better retrieval
    header = f"# File: {rel_path}\n\n"
    text = header + content

    # Send to LightRAG
    payload = json.dumps({
        "text": text,
        "doc_name": rel_path,
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            f"{RAG_URL}/documents/text",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        resp = urllib.request.urlopen(req, timeout=15)
        resp.read()
        # Success — file re-indexed
    except (urllib.error.URLError, ConnectionError, OSError):
        # Server not running — silent exit, don't block Claude Code
        sys.exit(0)
    except Exception:
        # Any other error — silent exit
        sys.exit(0)


if __name__ == "__main__":
    main()