# PRD Template

Use this structure when drafting a Product Requirements Document (PRD).

---

## 1. Overview

One paragraph describing the product or feature, the problem it solves, and why it matters now.

---

## 2. Problem Statement

- What is the user's current pain point?
- What workaround do they use today?
- What is the cost of the problem (time, error rate, missed decisions)?

---

## 3. Goals

List 2–4 specific, measurable outcomes this feature should achieve.

- Goal 1
- Goal 2
- Goal 3

---

## 4. Non-goals

Explicitly list what is out of scope for this version.

- Not doing X
- Not doing Y

---

## 5. Target Users

| User Role | Description | Primary Need |
| :--- | :--- | :--- |
| e.g., Research Scientist | PhD-level biologist analyzing datasets | Find relevant cohorts quickly |

---

## 6. User Workflows

Describe the step-by-step flow the user goes through today and how the feature changes it.

**Current workflow:**
1. Step 1
2. Step 2

**Future workflow with feature:**
1. Step 1 (unchanged)
2. Step 2 (improved by AI)

---

## 7. Functional Requirements

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| FR-01 | The system shall... | Must-have |
| FR-02 | The system shall... | Should-have |
| FR-03 | The system shall... | Nice-to-have |

---

## 8. API Dependencies

List existing API endpoints relied on, and any new endpoints or schema changes needed.

See `api-gap-analysis.md` for the full analysis template.

| API / Service | Endpoint | Status | Notes |
| :--- | :--- | :--- | :--- |
| e.g., CCDI Federation API | `/subject` | Existing | Needs pagination support |

---

## 9. Success Metrics

How will we measure whether this feature is working?

| Metric | Baseline | Target |
| :--- | :--- | :--- |
| e.g., Time to find cohort | 30 min manual | < 5 min with AI |

---

## 10. Risks and Assumptions

| Type | Description | Mitigation |
| :--- | :--- | :--- |
| Assumption | Users have sufficient biology context to interpret results | Provide in-app guidance |
| Risk | AI output may hallucinate biological entities | Add expert review step |
| Compliance | PHI/PII must not appear in AI prompts or responses | Use deidentified data layer |

---

## 11. Open Questions

- [ ] Question 1 — who decides?
- [ ] Question 2 — dependency on X team
- [ ] Question 3 — scientific validation needed?

---

## 12. References

- Link to relevant research, prior art, user interview notes, or API docs.
