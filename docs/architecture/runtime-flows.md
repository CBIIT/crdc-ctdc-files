# Runtime flows (bootstrap index)

This file is an index of the major runtime flow categories observed in the repository. It intentionally does not trace every feature end-to-end; instead it lists top-level flows and references code-backed starting points.

## Top-level runtime flow categories (Observed / Inferred)

- HTTP request handling — Observed: `app.js`, `bin/www`, `routes/`.
- File upload / download flows — Observed: `routes/files.js`, `services/file-auth.js`, `connectors/` implementations.
- Authentication & session management — Observed: `services/session.js`, `services/user-auth.js`, `auth.js`.
- Event logging — Observed: `bento-event-logging/` and associated models.
- Neo4j interactions — Observed: `neo4j/neo4j-operations.js` files.
- External storage / indexing integrations — Observed: `connectors/indexdConnector.js`, `S3Connector.js`, `publicS3Connector.js`, `cloudFrontConnector.js`.
 - External storage / indexing integrations — Observed: `connectors/indexdConnector.js`, `S3Connector.js`, `publicS3Connector.js`, `cloudFrontConnector.js`.
 - DCF access flow (GA4GH DRS) — Observed: `connectors/rasDcfConnector.js` implements passport validation and DCF `/access` calls to obtain signed URLs.

## Top-level flow diagram

```mermaid
flowchart TD
  A[Client HTTP] --> B[Express app (app.js)]
  B --> C[Router (routes/)]
  C --> D[File service (services/)]
  C --> E[Auth service (services/user-auth.js)]
  D --> F[Connector (S3 / indexd / local / publicS3)]
  D --> G[Event logging (bento-event-logging/)]
  G --> H[Neo4j]
  E --> I[Session store / mysql-connection?]
```

### DCF access subflow (observed)

```mermaid
flowchart TD
  Client-->Router
  Router-->FileService[File service]
  FileService-->RASDCF[rasDcfConnector]
  RASDCF-->DB[Sess DB]
  RASDCF-->STS[STS Validate (POST visa=...)]
  STS-->|Valid|RASDCF
  RASDCF-->DCF[DCF /access POST]
  DCF-->|{ url }|Client[Return signed URL]
```

Notes:
- The STS validation step is an observed POST to `https://stsstg.nih.gov/passport/validate` and the connector treats the plain-text response `Valid` as successful validation. This is explicitly implemented in `connectors/rasDcfConnector.js`.
- The connector returns the signed `url` from the DCF access response; it does not automatically download the file. If the direct `/access` POST fails, the connector fetches object metadata and retries with an `access_id` (preferring `s3`).

Notes:
- Diagram edges and nodes are based on observed file locations; some arrows are inferred (e.g., event logging calls into Neo4j) because Neo4j helper files exist in that module.
- For a specific flow trace (e.g., upload path), request a scoped deep-document and this file will be used as the starting index.
