#!/usr/bin/env python3
"""
rag-full-index.py — Index the entire codebase into LightRAG

Usage:
    python3 scripts/rag-full-index.py [--dir /path/to/project] [--url http://localhost:9621]

Sends all source files to the LightRAG HTTP API for indexing.
Supports incremental mode: only indexes files not yet in the index.
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

# File extensions to index
SOURCE_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx",       # Frontend
    ".py", ".mjs", ".cjs",               # Backend / scripts
    ".md", ".mdx",                        # Docs
    ".json", ".yaml", ".yml", ".toml",    # Config
    ".css", ".scss",                      # Styles
    ".html", ".svg",                      # Markup
}

# Directories to skip
SKIP_DIRS = {
    "node_modules", ".git", ".rag", ".claude", "dist", "build",
    ".next", ".appwrite-deploy", "__pycache__", ".husky",
}

# Max file size to index (100KB)
MAX_FILE_SIZE = 100_000

# Max concurrent requests
BATCH_DELAY = 0.1  # seconds between requests to avoid overwhelming the server


def check_server(url: str) -> bool:
    """Check if the LightRAG server is running."""
    try:
        req = urllib.request.Request(f"{url}/health", method="GET")
        urllib.request.urlopen(req, timeout=5)
        return True
    except (urllib.error.URLError, ConnectionError):
        return False


def get_indexed_docs(url: str) -> set:
    """Get the set of already-indexed document names."""
    try:
        req = urllib.request.Request(f"{url}/documents", method="GET")
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read().decode("utf-8"))
        if isinstance(data, list):
            return {doc.get("doc_name", "") for doc in data if isinstance(doc, dict)}
        elif isinstance(data, dict) and "data" in data:
            return {doc.get("doc_name", "") for doc in data["data"] if isinstance(doc, dict)}
        return set()
    except (urllib.error.URLError, ConnectionError):
        return set()


def index_file(url: str, file_path: Path, project_root: Path) -> bool:
    """Send a single file to LightRAG for indexing."""
    rel_path = str(file_path.relative_to(project_root))

    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        print(f"  SKIP {rel_path}: {e}", file=sys.stderr)
        return False

    if not content.strip():
        return False

    # Add file path as context header for better retrieval
    header = f"# File: {rel_path}\n\n"
    text = header + content

    payload = json.dumps({
        "text": text,
        "doc_name": rel_path,
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            f"{url}/documents/text",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        resp = urllib.request.urlopen(req, timeout=30)
        resp.read()  # consume response
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:200]
        print(f"  ERROR {rel_path}: HTTP {e.code} - {body}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"  ERROR {rel_path}: {e}", file=sys.stderr)
        return False


def collect_files(project_root: Path) -> list[Path]:
    """Collect all source files to index."""
    files = []
    for root, dirs, filenames in os.walk(project_root):
        # Skip unwanted directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]

        for filename in filenames:
            ext = Path(filename).suffix.lower()
            if ext in SOURCE_EXTENSIONS:
                file_path = Path(root) / filename
                # Skip large files
                try:
                    if file_path.stat().st_size > MAX_FILE_SIZE:
                        continue
                except OSError:
                    continue
                files.append(file_path)

    return sorted(files)


def main():
    parser = argparse.ArgumentParser(description="Index codebase into LightRAG")
    parser.add_argument("--dir", default=None, help="Project root directory")
    parser.add_argument("--url", default="http://localhost:9621", help="LightRAG server URL")
    parser.add_argument("--force", action="store_true", help="Re-index all files, even already indexed ones")
    parser.add_argument("--ext", nargs="+", default=None, help="Additional extensions to index (e.g. .vue .svelte)")
    args = parser.parse_args()

    # Determine project root
    project_root = Path(args.dir) if args.dir else Path(
        os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    )
    url = args.url.rstrip("/")

    # Add extra extensions
    if args.ext:
        SOURCE_EXTENSIONS.update(args.ext)

    print(f"RAG Full Index")
    print(f"  Project: {project_root}")
    print(f"  Server:  {url}")

    # Check server
    if not check_server(url):
        print(f"\nERROR: LightRAG server not running at {url}")
        print(f"Start it with: bash scripts/rag-start.sh")
        sys.exit(1)

    # Collect files
    print(f"\nScanning for source files...")
    files = collect_files(project_root)
    print(f"Found {len(files)} files to index.")

    if not files:
        print("No files to index.")
        return

    # Get already-indexed docs (for incremental mode)
    if not args.force:
        print("Checking existing index...")
        indexed = get_indexed_docs(url)
        new_files = [f for f in files if str(f.relative_to(project_root)) not in indexed]
        print(f"Already indexed: {len(indexed)}, New: {len(new_files)}")
        files = new_files

    if not files:
        print("All files already indexed. Use --force to re-index everything.")
        return

    # Index files
    print(f"\nIndexing {len(files)} files...")
    success = 0
    failed = 0

    for i, file_path in enumerate(files, 1):
        rel_path = str(file_path.relative_to(project_root))
        if index_file(url, file_path, project_root):
            success += 1
            print(f"  [{i}/{len(files)}] OK   {rel_path}")
        else:
            failed += 1
            print(f"  [{i}/{len(files)}] FAIL {rel_path}")

        # Rate limiting
        if i % 10 == 0:
            time.sleep(BATCH_DELAY * 10)

    print(f"\nDone! Indexed: {success}, Failed: {failed}")

    # Verify
    print(f"\nVerifying index...")
    indexed = get_indexed_docs(url)
    print(f"Total indexed documents: {len(indexed)}")


if __name__ == "__main__":
    main()