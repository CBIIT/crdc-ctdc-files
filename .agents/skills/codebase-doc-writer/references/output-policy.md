# Output Policy

## First Run

Generate:

- `docs/system-overview.md`
- `docs/architecture/components.md`
- `docs/architecture/runtime-flows.md`
- `docs/modules/README.md`
- `docs/features/README.md`
- `docs/ai-context.md`
- `docs/known-gaps.md`

Diagram expectation for first run:

- Include Mermaid diagrams in generated bootstrap docs where workflows or component interactions are documented and evidence is available
- Prioritize diagrams in:
	- `docs/system-overview.md`
	- `docs/architecture/components.md`
	- `docs/architecture/runtime-flows.md`
- If a reliable diagram cannot be produced, state the limitation and record uncertainty in `docs/known-gaps.md`

## Do Not Generate on First Run

Do not generate:

- `docs/modules/<module>.md`
- `docs/features/<feature>.md`

unless explicitly requested.

## Later Requests

When the user asks about one area:

- Create or update only the relevant module or feature doc
- Update `ai-context.md` only if overall understanding changes
- Record uncertainty in `known-gaps.md`
- Add or refresh Mermaid diagram(s) for the updated scope when workflow or architecture is part of the requested area
