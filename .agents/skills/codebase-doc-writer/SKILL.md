---
name: codebase-doc-writer
description: "analyze an existing code repository and its current docs to generate and maintain system documentation, component maps, runtime flow indexes, module indexes, feature indexes, ai context, and known gaps. use when the user wants to understand how a program works, document architecture, trace implementation paths, prepare future maintenance context, or refresh project documentation after changes."
---

# Purpose

Analyze the repository and existing `/docs` content to generate bootstrap architecture documentation and durable AI-readable maintenance context.

# Default Behavior

On first run, generate bootstrap docs and indexes only.
Do not generate deep per-module or per-feature documentation unless explicitly requested or required for a change task.

# Required Inputs

- Repository source tree
- Existing `/docs` content if present
- Root README and configuration files if present

# Analysis Order

1. Inspect repo structure
2. Inspect existing `/docs`
3. Identify entrypoints and startup paths
4. Identify major components and boundaries
5. Identify major runtime flow categories
6. Identify unknowns and confidence limits
7. Generate bootstrap docs and indexes

Reference: [analysis-rules.md](./references/analysis-rules.md)

# Output Files

- `docs/system-overview.md`
- `docs/architecture/components.md`
- `docs/architecture/runtime-flows.md`
- `docs/modules/README.md`
- `docs/features/README.md`
- `docs/ai-context.md`
- `docs/known-gaps.md`

Reference: [doc-templates.md](./references/doc-templates.md), [output-policy.md](./references/output-policy.md)

# Documentation Rules

- Separate observed facts from inference
- Prefer file-backed explanations
- Avoid pretending uncertain flows are complete
- Re-use existing `/docs` where accurate
- Note contradictions between code and docs
- Write outputs for both humans and future AI-assisted changes
- If a section references workflow, lifecycle, request path, or process steps, include a Mermaid system design diagram for that section when possible
- Keep Mermaid diagrams code-backed; do not invent nodes or edges that are not supported by the repository
- If a workflow diagram cannot be produced with confidence, explicitly state why and mark the missing parts as **Unknown**

# First-Run Bootstrap Policy

When no prior generated architecture docs exist, create only the bootstrap set:

- `docs/system-overview.md`
- `docs/architecture/components.md`
- `docs/architecture/runtime-flows.md`
- `docs/modules/README.md`
- `docs/features/README.md`
- `docs/ai-context.md`
- `docs/known-gaps.md`

The `runtime-flows.md` file should be an index of major flow categories, not a full end-to-end trace of every feature.

Include at least one Mermaid diagram in `runtime-flows.md` representing the top-level flow categories and entrypoints when possible.

The modules and features README files should be indexes and scoping guides, not full coverage documents.

Include Mermaid diagrams in bootstrap docs where possible, especially in `system-overview.md`, `architecture/components.md`, and `architecture/runtime-flows.md`.

# Scoped Deep-Documentation Policy

When the user asks about a specific module, subsystem, or feature:

1. Read bootstrap docs first
2. Inspect the relevant code paths
3. Generate or update only the relevant scoped document
4. Refresh `ai-context.md` only if project-wide understanding changes
5. Append unresolved questions to `known-gaps.md`

Examples:

- Billing module → `docs/modules/billing.md`
- Login flow → `docs/features/login.md`
- Order creation → `docs/features/order-creation.md`

# Update Rules

When a later request targets a specific module or feature:

- Read the bootstrap docs first
- Trace only the requested scope
- Create or update the specific module or feature doc
- Update `ai-context.md` if architectural understanding changed
- Append unresolved issues to `known-gaps.md`

# Existing Docs Policy

- Inspect existing `/docs`
- Preserve useful material
- Merge or refine when accurate
- Do not overwrite good existing docs just to match a template
- Record stale or contradictory sections in `known-gaps.md`

# Confidence and Uncertainty

Label all findings as one of:

- **Observed** — directly confirmed from code
- **Inferred** — derived from structure or patterns
- **Unknown** — not yet confirmed

In generated docs, uncertainty should appear naturally:

- "Observed entrypoint: `src/index.js`"
- "Likely service boundary inferred from router and component wiring"
- "Background worker initialization is not yet confirmed"

# Helper Scripts

- [repo_inventory.py](./scripts/repo_inventory.py) — scan repo structure for a structured starting inventory
- [bootstrap_doc_plan.py](./scripts/bootstrap_doc_plan.py) — generate a doc plan from inventory and existing docs
