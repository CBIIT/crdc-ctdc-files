# Biology Domain Guide

Reference for common biology and life science terminology, workflows, and domain cautions relevant to AI product design.

---

## Key Concepts and Entities

### Subjects / Participants
- A **subject** is a research participant — typically a patient or donor.
- Key attributes: demographics (sex, age, race, ethnicity), vital status, diagnoses, samples, files.
- Subjects are often deidentified; data access is governed by data use agreements.

### Diagnoses
- A **diagnosis** is a medical finding assigned to a subject.
- Common ontologies: [MONDO Disease Ontology](https://mondo.monarchinitiative.org/), [NCIt (NCI Thesaurus)](https://ncit.nci.nih.gov/), ICD-10.
- Diagnoses may include primary diagnosis, age at diagnosis, tumor type, and stage.

### Samples / Biospecimens
- A **sample** is a biological specimen collected from a subject (blood, tissue, tumor biopsy, etc.).
- Key attributes: sample type, anatomical site, preservation method, collection date.

### Files / Data
- **Files** are data objects (genomic sequences, imaging, clinical reports) linked to subjects or samples.
- Files are not delivered by federation APIs — only metadata and access location.

### Cohorts
- A **cohort** is a subset of subjects selected by shared criteria.
- **Virtual cohorts** span multiple data sources without centralizing data.

---

## Common Biology Workflows

### Cohort Discovery
1. Researcher defines inclusion criteria (e.g., pediatric patients with specific cancer type).
2. Queries federation API across participating nodes.
3. Reviews matching subjects and data availability.
4. Requests access to underlying data files from individual nodes.

### Differential Analysis
1. Researcher defines two or more cohorts.
2. Compares genomic, clinical, or phenotypic features.
3. Identifies biomarkers or clinical associations.

### Hypothesis Generation
1. Researcher notices a pattern or gap in the literature.
2. Queries data to find supporting or contradicting evidence.
3. Formulates a testable hypothesis.
4. Plans a follow-up study or analysis.

---

## Important Ontologies and Vocabularies

| Ontology | Domain | Use |
| :--- | :--- | :--- |
| MONDO | Disease | Disease classification |
| HPO | Phenotype | Human phenotype terms |
| NCIt | Cancer/Biomedical | NCI thesaurus terms |
| UMLS | Biomedical | Unified medical language |
| SNOMED CT | Clinical | Clinical findings and procedures |
| ICD-10 | Clinical | International disease codes |
| UBERON | Anatomy | Anatomical structure terms |
| EFO | Experimental factors | Study metadata |

---

## AI Product Design Cautions

### Scientific Validation
- AI-generated biological claims must be traceable to source data or literature.
- Do not generate diagnostic or clinical conclusions without expert review.
- Flag when AI output is an inference vs. a direct data retrieval.

### Data Quality
- Federation data may have inconsistent harmonization across nodes.
- Missing values are common; do not treat `null` as zero or negative.
- Ontology mismatches across data sources can cause false negatives in search.

### Compliance
- All data in the CCDI Federation API is deidentified (no PHI/PII).
- Do not allow user input that might include PHI to be passed to external AI models.
- Data access beyond open metadata requires node-specific data use agreements.

### Hallucination Risk
- LLMs may fabricate gene names, drug names, or disease associations.
- Always ground AI responses in API-retrieved data, not model memory.
- Provide citations or source references for any factual biological claims.

### Expert Reviewability
- Outputs should be reviewable by a domain scientist, not just engineers.
- Use standard terminology (ontology terms, common abbreviations) rather than invented language.

---

## Pediatric Cancer Context (CCDI-Specific)

- **CCDI** = Childhood Cancer Data Initiative, an NCI program.
- Focus: pediatric and adolescent/young adult (AYA) cancers.
- Key data types: genomics (WGS, WES, RNA-seq), clinical metadata, imaging.
- Participating nodes: Kids First, Pediatric Cancer Data Commons (PCDC), St. Jude Cloud, Treehouse, CCDI ecDNA, Pediatric Solid Tumor Program-IUSCCC.
- Researchers are often computational biologists, bioinformaticians, clinical researchers, or oncologists.
