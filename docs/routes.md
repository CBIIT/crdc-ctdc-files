# File Service Routes

This service is mounted under:

```text
/api/files
```

The routes support both default file lookup and source-specific lookup such as
RAS. Source-specific routes are used when the first path segment is a supported
source from `connectors/connectorsFromSource.js`, for example `ras`.

## Route Summary

| Request path | Connector | File ID passed to connector | Notes |
|---|---|---|---|
| `/api/files/{uuid}` | Default connector | `{uuid}` | Basic file lookup. |
| `/api/files/dg.4DFC/{uuid}` | Default connector | `dg.4DFC/{uuid}` | GUID lookup with known prefix. |
| `/api/files/ras/{uuid}` | RAS connector | `{uuid}` | RAS lookup without study accession. |
| `/api/files/ras/dg.4DFC/{uuid}` | RAS connector | `dg.4DFC/{uuid}` | RAS GUID lookup without study accession. |
| `/api/files/ras/{phs}/{uuid}` | RAS connector | `{uuid}` | RAS lookup with study accession for logging. |
| `/api/files/ras/{phs}/dg.4DFC/{uuid}` | RAS connector | `dg.4DFC/{uuid}` | Preferred RAS GUID lookup. |

## Response Shape

Successful signed URL lookups return JSON:

```json
{
  "url": "https://signed-url.example/file"
}
```

The route handler normalizes connector responses when the connector returns a
raw signed URL string or an object with `url`, `presigned_url`, or `fileURL`.
Error responses keep the connector status and message.

## Preferred CTDC Frontend Usage

For non-RAS/default downloads, use the file identifier as provided by GraphQL:

```text
/api/files/dg.4DFC/{uuid}
```

For RAS downloads, prefer the full source + study + GUID route:

```text
/api/files/ras/{studyAccession}/dg.4DFC/{uuid}
```

This route is unambiguous, preserves the study accession for audit logging, and
passes the expected DRS object ID (`dg.4DFC/{uuid}`) to the RAS DCF connector.

## Route Matching Logic

The route file intentionally separates two concepts:

- Supported source names, such as `RAS`, are checked against
  `getURLFromSource.supportedSources`.
- GUID prefixes, currently `dg.4DFC`, are checked separately before rebuilding a
  prefixed file ID.

This avoids ambiguous Express matches. For example:

```text
/api/files/ras/phs000000/file-uuid
```

is treated as:

```text
source = ras
study accession = phs000000
file ID = file-uuid
```

It is not treated as:

```text
source = ras
GUID prefix = phs000000
file ID = file-uuid
```

Likewise:

```text
/api/files/ras/phs000000/dg.4DFC/file-uuid
```

is treated as:

```text
source = ras
study accession = phs000000
file ID = dg.4DFC/file-uuid
```

The auth middleware uses the same canonical file ID parsing for ACL lookup, so
authorization and connector download use the same file identifier.
