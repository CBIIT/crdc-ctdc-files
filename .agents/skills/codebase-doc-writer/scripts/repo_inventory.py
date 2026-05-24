#!/usr/bin/env python3
"""
Repo Inventory Script

Walks the repository and produces a structured JSON inventory of:
- top-level directories
- likely entrypoints
- existing docs
- config files
- test directories
- candidate components/modules
"""

import json
import os
import sys
from pathlib import Path

IGNORE_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".nuxt", "coverage", ".cache",
    ".tox", "egg-info", ".eggs", "vendor", "target",
}

ENTRYPOINT_PATTERNS = {
    "main.py", "app.py", "index.py", "server.py", "manage.py",
    "main.ts", "app.ts", "index.ts", "server.ts",
    "main.js", "app.js", "index.js", "server.js",
    "main.go", "cmd",
}

CONFIG_PATTERNS = {
    "package.json", "pyproject.toml", "setup.py", "setup.cfg",
    "Cargo.toml", "go.mod", "pom.xml", "build.gradle",
    "Makefile", "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
    ".env", ".env.example", "tsconfig.json", "webpack.config.js",
    "vite.config.ts", "vite.config.js", "next.config.js",
}


def find_repo_root(start: str = ".") -> Path:
    """Walk up until we find a .git directory or use the start path."""
    current = Path(start).resolve()
    while current != current.parent:
        if (current / ".git").is_dir():
            return current
        current = current.parent
    return Path(start).resolve()


def walk_repo(root: Path):
    """Walk the repo, skipping ignored directories."""
    top_level_dirs = []
    likely_entrypoints = []
    config_files = []
    test_dirs = []
    docs_present = False
    candidate_components = []

    for item in sorted(root.iterdir()):
        name = item.name
        if name.startswith(".") and name != ".env.example":
            continue
        if item.is_dir():
            if name in IGNORE_DIRS:
                continue
            top_level_dirs.append(name)
            if name in ("docs", "doc", "documentation"):
                docs_present = True
            if name in ("test", "tests", "spec", "specs", "__tests__"):
                test_dirs.append(name)
        elif item.is_file():
            if name in CONFIG_PATTERNS:
                config_files.append(name)

    # Scan src/ or top-level for entrypoints and components
    src_dirs = [root / d for d in ("src", "app", "lib", "pkg", "cmd") if (root / d).is_dir()]
    scan_dirs = src_dirs if src_dirs else [root]

    for scan_dir in scan_dirs:
        for item in sorted(scan_dir.iterdir()):
            name = item.name
            if item.is_file() and name in ENTRYPOINT_PATTERNS:
                likely_entrypoints.append(str(item.relative_to(root)))
            if item.is_dir() and name not in IGNORE_DIRS and not name.startswith("."):
                if scan_dir != root:
                    candidate_components.append(name)

    # Also check /docs within top-level dirs
    if not docs_present:
        for d in top_level_dirs:
            docs_path = root / d / "docs"
            if docs_path.is_dir():
                docs_present = True
                break

    return {
        "repo_root": str(root),
        "docs_present": docs_present,
        "top_level_dirs": top_level_dirs,
        "likely_entrypoints": likely_entrypoints,
        "config_files": config_files,
        "test_dirs": test_dirs,
        "candidate_components": candidate_components,
    }


def main():
    start = sys.argv[1] if len(sys.argv) > 1 else "."
    root = find_repo_root(start)
    inventory = walk_repo(root)
    print(json.dumps(inventory, indent=2))


if __name__ == "__main__":
    main()
