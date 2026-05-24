# Discovery Framework

Use these questions during product discovery to surface context, validate assumptions, and scope requirements.

---

## Product & Application Context

- What is this application or service? What does it currently do?
- Who built it and who owns it?
- What APIs or data services does it already expose?
- What is the current user experience (UI, CLI, API-only)?
- What stage is it at — early prototype, beta, or production?

---

## User Context

- Who is the primary user? (Role, expertise level, institution type)
- What biology or life science workflow are they performing?
- How technical are users — can they write code, SQL, or use APIs?
- How often do they do this task? What is the volume?
- Where do users currently go when they need help?

---

## Pain Point Identification

- What is the specific pain point or bottleneck in their current workflow?
- What do users complain about most?
- What decisions do they struggle to make without better tools?
- What workaround do they use today? Why isn't it good enough?
- What data do they wish they had but can't easily get?

---

## AI Feature Scoping

- What parts of this workflow require significant interpretation vs. just retrieval?
- What would the user do with an AI response — act on it directly, review it, or pass it to someone else?
- Would the user trust an AI answer, or do they need a citation/source?
- What is the consequence if the AI is wrong? (Low-stakes annoyance vs. scientific error vs. clinical harm)
- Is the AI expected to explain, rank, summarize, generate, or search?

---

## Data & API Readiness

- What data is available via existing APIs or databases?
- Is the data harmonized across sources, or are there inconsistencies?
- Are there known data quality issues, missing values, or coverage gaps?
- What identifiers or ontologies are used? (e.g., MONDO, HPO, NCIt, UMLS)
- What cannot be returned due to access restrictions, PHI/PII, or licensing?

---

## Constraints

- Are there compliance requirements — HIPAA, institutional review, data use agreements?
- What is the latency tolerance for AI responses?
- Does the output need to be auditable or traceable?
- Are there regulatory or publication concerns about AI-generated content?
- What is out of scope for this version?

---

## Success Definition

- How will we know the feature is working?
- What does a great user experience look like?
- What metrics matter — time saved, accuracy, adoption rate, expert approval?
- Who reviews and approves the output before it goes to users?
