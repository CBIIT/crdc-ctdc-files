# Modules README (bootstrap)

This is an index and scope guide for primary code modules. It is intentionally lightweight — use it to pick a module for deeper documentation.

- `app.js`, `bin/www` — application startup and server launch.
- `routes/` — HTTP route handlers (entrypoints for request flows). See `routes/files.js`.
- `services/` — service-level logic and orchestration. Examples: `file-auth.js`, `user-auth.js`, `session.js`.
- `connectors/` — adapters to external systems: `S3Connector.js`, `indexdConnector.js`, `cloudFrontConnector.js`, etc.
- `model/` — domain models (bento, c3dc, cds, ctdc, ...).
- `neo4j/` — graph DB helpers and operations.
- `bento-event-logging/` — separate event logging subsystem with its own models, constants, and neo4j helpers.
- `utils/` — shared utilities and string helpers.
- `test/` — unit tests for services and models.

Pick a module name and I can generate a deeper document following the scoped deep-documentation policy.
