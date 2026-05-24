# Components

This document lists and briefly describes the repository's major components. Each item is labeled as **Observed** (directly from code), **Inferred** (likely from structure), or **Unknown**.

## HTTP Server
- Observed: `app.js`, `bin/www`, and `routes/` suggest an Express-based HTTP server.

## Routing Layer
- Observed: `routes/` contains `files.js` and likely other route definitions; routes map requests to services.

## Services
- Observed: `services/` contains `file-auth.js`, `mysql-connection.js`, `session.js`, `user-auth.js` — business logic and data-access helpers.

## Connectors
- Observed: `connectors/` contains `S3Connector.js`, `indexdConnector.js`, `cloudFrontConnector.js`, `localConnector.js`, `dummyConnector.js`, `publicS3Connector.js` and `rasDcfConnector.js` — abstractions over external storage/transfer systems.

- Observed (new): `connectors/rasDcfConnector.js` implements DCF access:
	- Validates a passport/visa via STS (`https://stsstg.nih.gov/passport/validate`) by POSTing `visa=...` (form-encoded) and treating the plain-text response `Valid` as success. **Observed**: `rasDcfConnector.js` contains `validatePassport()`.
	- Requests access from the DCF API by POSTing a JSON body `{ "passports": ["<passport>"] }` to the DCF `/access` endpoint and returns a signed `url` when present. **Observed**: `fetchDCFFile()`.
	- Access selection: attempts POST to `/access`, then falls back to object metadata to select an `access_id`, preferring `s3` when available. **Observed / Inferred**.

## Event Logging
- Observed: `bento-event-logging/` with `model/`, `const/`, and `neo4j/` subfolders — separate event logging subsystem used by multiple models.

## Data Models
- Observed: `model/` (root) with domain models (bento.js, c3dc.js, cds.js, ctdc.js, etc.) and `bento-event-logging/model/` for event entities.

## Neo4j
- Observed: `neo4j/neo4j-operations.js` at root and another under `bento-event-logging/neo4j/` — indicates graph DB usage for some features.

## Utilities and Auth
- Observed: `utils/string-util.js`, `utils/index.js`, `auth.js`, `newrelic.js` and `services/user-auth.js` — cross-cutting helpers.

## Tests
- Observed: `test/` contains unit tests for services and models (e.g., `file.service.test.js`, `user.service.test.js`, `model/cds.test.js`).

## Inferred Boundaries
- Inferred: `connectors/` implement an interchangeable adapter boundary for storage backends.
- Inferred: `services/` provide business logic and orchestrate connectors and models.

## Unknowns / Needs confirmation
- Unknown: precise database(s) used for persistent relational storage (MySQL is suggested by `mysql-connection.js` but not fully traced).
- Unknown: where environment config is loaded (see `config.js` and `config.env.example`).
