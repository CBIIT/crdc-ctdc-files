# Analysis Rules

## Read in This Order

1. Root README
2. Existing `/docs`
3. App entrypoints
4. Router/controller/bootstrap files
5. Service/core modules
6. Persistence/integration layers
7. Tests for confirmation

## Prefer These Signals

- Startup/bootstrap code
- Routing registration
- Dependency injection wiring
- Config loading
- Database model registration
- Worker/job/event registration
- Integration client setup

## Workflow and Diagram Rule

- When documenting any workflow, include a Mermaid system design diagram when code evidence is sufficient
- Build diagram nodes/edges from observed entrypoints, component boundaries, and integration calls
- If diagram confidence is partial, keep the diagram for observed segments and annotate unresolved parts as **Unknown** in text

## Avoid Weak Assumptions

Do not infer architecture only from directory names.

## Confidence Labeling

Mark findings as:

- **Observed** — directly confirmed from code
- **Inferred** — derived from structure or patterns
- **Unknown** — not yet confirmed

## Reconciliation

If existing docs conflict with code:

- Trust current code over stale docs
- Record mismatch in `known-gaps.md`

## Existing Docs Policy

- Inspect existing `/docs`
- Preserve useful material
- Merge or refine when accurate
- Do not overwrite good existing docs just to match a template
- Record stale or contradictory sections in `known-gaps.md`
