#!/usr/bin/env python3
"""
Bootstrap Doc Plan Script

Takes repo inventory (from repo_inventory.py) and existing docs state
to produce a JSON doc generation plan:
- which bootstrap docs to generate
- which existing docs to reuse
- what information is missing or unclear
"""

import json
import os
import sys
from pathlib import Path

BOOTSTRAP_DOCS = [
    "docs/system-overview.md",
    "docs/architecture/components.md",
    "docs/architecture/runtime-flows.md",
    "docs/modules/README.md",
    "docs/features/README.md",
    "docs/ai-context.md",
    "docs/known-gaps.md",
]


def load_inventory(path: str) -> dict:
    """Load repo inventory JSON from stdin or a file path."""
    if path == "-":
        return json.load(sys.stdin)
    with open(path, "r") as f:
        return json.load(f)


def scan_existing_docs(repo_root: str) -> list[str]:
    """Find all markdown files under docs/."""
    docs_dir = Path(repo_root) / "docs"
    if not docs_dir.is_dir():
        return []
    return [
        str(p.relative_to(repo_root))
        for p in sorted(docs_dir.rglob("*.md"))
    ]


def build_plan(inventory: dict) -> dict:
    """Build a doc generation plan from inventory and existing docs."""
    repo_root = inventory.get("repo_root", ".")
    existing_docs = scan_existing_docs(repo_root)

    # Determine which bootstrap docs need to be generated
    to_generate = []
    reuse_existing = []

    for doc in BOOTSTRAP_DOCS:
        if doc in existing_docs:
            reuse_existing.append(doc)
        else:
            to_generate.append(doc)

    # Also flag existing docs not in bootstrap set as reusable
    for doc in existing_docs:
        if doc not in BOOTSTRAP_DOCS and doc not in reuse_existing:
            reuse_existing.append(doc)

    # Identify missing information based on inventory gaps
    missing_info = []
    if not inventory.get("likely_entrypoints"):
        missing_info.append("No clear entrypoints identified — manual inspection needed")
    if not inventory.get("docs_present"):
        missing_info.append("No existing /docs directory found")
    if not inventory.get("candidate_components"):
        missing_info.append("No candidate components/modules identified from source tree")
    if not inventory.get("test_dirs"):
        missing_info.append("No test directories found — cannot cross-reference behavior")

    return {
        "generate": to_generate,
        "reuse_existing_docs": reuse_existing,
        "missing_information": missing_info,
    }


def main():
    if len(sys.argv) > 1:
        inventory = load_inventory(sys.argv[1])
    else:
        inventory = load_inventory("-")

    plan = build_plan(inventory)
    print(json.dumps(plan, indent=2))


if __name__ == "__main__":
    main()
