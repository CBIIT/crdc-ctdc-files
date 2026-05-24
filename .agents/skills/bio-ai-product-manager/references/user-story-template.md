# User Story Template

Use this format for all user stories. Each story should be independently testable and scoped to a single user need.

---

## Standard Format

```
As a [user role],
I want [action or capability],
So that [outcome or value].
```

---

## Full Story Card

### Story Title

**As a** `[user role]`
**I want** `[action or capability]`
**So that** `[outcome or value]`

---

**Acceptance Criteria**

- [ ] Given `[precondition]`, when `[action]`, then `[expected result]`.
- [ ] Given `[precondition]`, when `[action]`, then `[expected result]`.
- [ ] Given `[precondition]`, when `[action]`, then `[expected result]`.

---

**Edge Cases**

- What happens when the query returns no results?
- What happens when the API is unavailable?
- What happens when the AI response contains uncertainty?
- What happens when the user input is ambiguous?

---

**Dependencies**

- Requires API endpoint: `[endpoint]`
- Requires data field: `[field]`
- Blocked by: `[team or ticket]`

---

**Definition of Done**

- [ ] Feature is implemented and passes acceptance criteria.
- [ ] Edge cases are handled with appropriate messaging.
- [ ] Unit and integration tests written.
- [ ] Reviewed by PM and, if relevant, domain scientist.
- [ ] Documented in API/user docs.

---

## Examples

### Example 1 — Cohort Discovery

**As a** research scientist,
**I want** to filter subjects by diagnosis and vital status using natural language,
**So that** I can quickly identify a cohort without manually browsing API documentation.

**Acceptance Criteria**
- [ ] Given a logged-in user, when they type "pediatric patients with AML who are alive", then the system returns subjects matching `diagnosis=AML` and `vital_status=Alive`.
- [ ] Given no matching subjects, when the query is submitted, then the system displays "No subjects found for your criteria" with suggested alternatives.
- [ ] Given an ambiguous disease term, when the query is submitted, then the system asks the user to clarify using a suggested ontology term.

---

### Example 2 — PRD Drafting Assistance

**As a** product manager,
**I want** the AI to generate a structured PRD draft from a rough idea description,
**So that** I can accelerate documentation and focus on refinement rather than blank-page writing.

**Acceptance Criteria**
- [ ] Given a paragraph describing a feature idea, when submitted, then the AI returns a draft with at least: Product Goal, User Problem, Functional Requirements, Non-goals, and Open Questions.
- [ ] Given incomplete context, when the idea is submitted, then the AI asks at least one clarifying question before drafting.
- [ ] Given a PRD draft, when the user requests revisions, then the AI updates the specific section without regenerating the entire document.
