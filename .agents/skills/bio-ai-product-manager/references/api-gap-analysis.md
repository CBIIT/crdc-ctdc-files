# API Gap Analysis

Use this template to identify what the API currently supports, what is missing, and what changes are needed to implement a proposed feature.

---

## Step 1: Define Required Data Inputs

List every data input the proposed AI feature needs to function.

| Input | Description | Format | Required? |
| :--- | :--- | :--- | :--- |
| e.g., Subject demographics | Sex, race, ethnicity per subject | JSON | Yes |
| e.g., Diagnosis list | Primary diagnosis with ontology terms | JSON | Yes |
| e.g., File availability | Whether genomic files exist for subject | JSON | Optional |

---

## Step 2: Map Inputs to Existing API Endpoints

For each input, identify which existing endpoint (if any) provides it.

| Input | Endpoint | Supported? | Notes |
| :--- | :--- | :--- | :--- |
| Subject demographics | `GET /subject` | Yes | Paginates at 100/page |
| Diagnosis list | `GET /subject/{ns}/{name}/diagnoses` | Yes | Per-subject only |
| Aggregate counts | `GET /summary` | Partial | No breakdown by site |
| Free-text search | — | No | Not in current API |

---

## Step 3: Identify Gaps

| Gap | Type | Impact | Priority |
| :--- | :--- | :--- | :--- |
| No semantic/free-text search | Missing endpoint | High — blocks NLP-based query | Must-have |
| No cross-node aggregate filter | Missing capability | Medium — limits cohort sizing | Should-have |
| No file download URL in metadata | Missing field | High — blocks access workflow | Must-have |
| Rate limiting not documented | Unclear | Medium — may affect AI query volume | Investigate |

**Gap types:**
- **Missing endpoint** — no route exists
- **Missing field** — endpoint exists but key data is absent from response
- **Missing capability** — feature is architecturally not supported (e.g., real-time streaming)
- **Access restriction** — data exists but is gated by policy
- **Schema inconsistency** — response shape varies across nodes

---

## Step 4: Propose Changes

For each gap, propose the minimal change needed.

| Gap | Proposed Change | New Endpoint / Field | Complexity |
| :--- | :--- | :--- | :--- |
| Free-text search | Add search endpoint | `GET /search?q=` | High |
| Cross-node aggregate filter | Extend `/summary` | `?diagnosis=` filter param | Medium |
| File download URL | Add `access_url` field to file schema | Schema change | Low |

---

## Step 5: Non-functional Considerations

Address these for any API-dependent AI feature:

| Concern | Question | Status |
| :--- | :--- | :--- |
| **Latency** | Can the API respond within the AI's context window timeout? | Investigate |
| **Pagination** | Does the feature need all results or just the first page? | Define per feature |
| **Authentication** | Does the endpoint require auth tokens? | Check node policies |
| **Rate limiting** | Are there request limits that could block bulk AI queries? | Investigate |
| **Auditability** | Do we need to log what data the AI accessed? | Required for compliance |
| **Schema stability** | Will the API schema change in ways that break the AI feature? | Version-lock |
| **Data freshness** | How stale can data be before it affects AI output quality? | Define SLA |

---

## Step 6: Dependency Summary

Summarize all blockers before engineering can implement the feature.

| Dependency | Owner | Status | Blocking? |
| :--- | :--- | :--- | :--- |
| New `/search` endpoint | API team | Not started | Yes |
| Updated file schema | Data model team | In progress | Yes |
| Auth token for node X | Node X team | Under review | Conditional |
