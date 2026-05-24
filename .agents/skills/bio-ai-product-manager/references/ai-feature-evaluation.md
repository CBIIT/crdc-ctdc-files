# AI Feature Evaluation

Use this framework to assess whether a proposed AI feature is worth building. Score each criterion and use the summary to inform the go/no-go decision.

---

## Evaluation Criteria

### 1. User Value
**Question:** Does this feature address a real, high-frequency pain point for a defined user?

| Score | Meaning |
| :--- | :--- |
| High | Directly removes a significant bottleneck in a common workflow |
| Medium | Improves a workflow but the current approach is tolerable |
| Low | Nice-to-have; users rarely encounter this problem |

---

### 2. Feasibility
**Question:** Can this be built reliably with current technology, APIs, and team capacity?

| Score | Meaning |
| :--- | :--- |
| High | Straightforward with existing tools; no major unknowns |
| Medium | Solvable but requires new infrastructure or integration work |
| Low | Requires capabilities that don't exist yet or are highly uncertain |

---

### 3. Data Availability
**Question:** Is the data needed to power this feature accessible, sufficient in quality, and permissible to use?

| Score | Meaning |
| :--- | :--- |
| High | Data is available, harmonized, and API-accessible |
| Medium | Data exists but is incomplete, inconsistent, or requires access negotiation |
| Low | Data is unavailable, restricted, or does not yet exist |

---

### 4. Explainability
**Question:** Can the AI explain its output in a way users will trust and understand?

| Score | Meaning |
| :--- | :--- |
| High | Output is traceable to source data; citations or provenance are included |
| Medium | Output is plausible but not directly traceable without extra work |
| Low | Output is opaque; users have no way to verify or challenge it |

---

### 5. Failure Mode Severity
**Question:** What is the worst-case consequence if the AI is wrong?

| Score | Meaning |
| :--- | :--- |
| Low | Minor inconvenience; user notices and corrects it easily |
| Medium | Wasted time or incorrect analysis; recoverable with review |
| High | Scientific error, compliance violation, or patient safety impact |

> **Note:** High failure severity features require mandatory human review steps and should not be auto-applied.

---

### 6. Hallucination Risk
**Question:** How likely is the AI to generate plausible-sounding but factually incorrect biological content?

| Score | Meaning |
| :--- | :--- |
| Low | Feature is grounded in retrieved data; model generates structure, not facts |
| Medium | Feature involves some interpretation; output should be reviewed |
| High | Feature requires the model to generate biological facts from memory; high risk without grounding |

> **Mitigation:** Ground all factual claims in API-retrieved data or cited literature. Never use model memory as a source of biological truth.

---

### 7. Expert Reviewability
**Question:** Can a domain scientist meaningfully review and correct the AI output?

| Score | Meaning |
| :--- | :--- |
| High | Output uses standard terminology and is clearly structured for expert review |
| Medium | Output is partially reviewable but requires interpretation |
| Low | Output is not in a form experts can evaluate (e.g., raw embeddings, unexplained scores) |

---

## Summary Scorecard

| Criterion | Score (High / Medium / Low) | Notes |
| :--- | :--- | :--- |
| User Value | | |
| Feasibility | | |
| Data Availability | | |
| Explainability | | |
| Failure Mode Severity | | |
| Hallucination Risk | | |
| Expert Reviewability | | |

---

## Decision Guide

| Pattern | Recommendation |
| :--- | :--- |
| High value + High feasibility + Low failure severity | Build now |
| High value + Medium feasibility + Medium failure severity | Build with review step |
| High failure severity (regardless of value) | Require expert-in-the-loop before shipping |
| High hallucination risk + Low data availability | Do not build until data grounding is solved |
| Low user value (regardless of feasibility) | Deprioritize or drop |

---

## Questions to Ask Before Approving

- Have real users been asked about this feature, or is it PM/eng assumption?
- Is there a domain scientist who can validate the AI output before launch?
- What happens at launch if the AI is wrong 10% of the time?
- Is there a feedback mechanism for users to flag incorrect AI responses?
- Does this feature require an IRB review or data use agreement update?
