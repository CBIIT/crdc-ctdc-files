# Features README (bootstrap)

High-level feature index. Each item links to code locations to help scope focused documentation requests.

- User authentication: `services/user-auth.js`, `services/session.js`, `auth.js`.
- File upload / download: `routes/files.js`, `services/file-auth.js`, `connectors/`.
- Event logging and auditing: `bento-event-logging/` (models, constants, neo4j integration).
- Neo4j-backed features: `neo4j/neo4j-operations.js` and `bento-event-logging/neo4j/`.
- External integrations: S3, indexd, CloudFront connectors in `connectors/`.

Request a specific feature (e.g., "login flow" or "upload flow") and I will generate a scoped feature doc.
