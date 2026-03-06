# Gen3 File Proxy Service

[![Tests](https://github.com/your-org/gen3-file-proxy/actions/workflows/test.yml/badge.svg)](https://github.com/your-org/gen3-file-proxy/actions/workflows/test.yml)
[![Coverage Status](https://coveralls.io/repos/github/your-org/gen3-file-proxy/badge.svg?branch=main)](https://coveralls.io/github/your-org/gen3-file-proxy?branch=main)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A FastAPI-based microservice for streaming Gen3 files with user-specific token authentication. This service acts as a secure proxy that validates user permissions and streams files without exposing Gen3 URLs to the frontend.

## Features

- ✅ **Token-based Authentication**: Uses user's Gen3 tokens for per-user authorization
- ✅ **Streaming Proxy**: Efficiently streams large files without buffering in memory
- ✅ **Security Compliant**: No Gen3 URLs exposed to clients, satisfies security requirements
- ✅ **Rate Limiting**: Built-in rate limiting to prevent abuse
- ✅ **Auto-generated API Docs**: OpenAPI/Swagger documentation at `/docs`
- ✅ **Health Checks**: Multiple health check endpoints for monitoring
- ✅ **Async Performance**: FastAPI with async streaming for concurrent downloads
- ✅ **CORS Support**: Configurable CORS for frontend integration
- ✅ **Structured Logging**: Correlation IDs and structured logs for audit trails

## Architecture

```
Frontend (with user's Gen3 token)
    ↓
    ├─→ GET /api/files/{file_id}
    │   Authorization: Bearer <user_gen3_token>
    ↓
Gen3 File Proxy Service
    ├─→ Verify token with Gen3
    ├─→ Check file authz via Gen3 API
    └─→ Stream file chunks: Gen3 → Proxy → Client
```

## Prerequisites

- Python 3.11+
- Gen3 Commons with accessible API
- User Gen3 tokens (JWT or API tokens)

## Quick Start

### 1. Clone and Setup

```bash
cd gen3-file-proxy
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` with your Gen3 configuration:

```bash
# Gen3 Configuration
GEN3_API_URL=https://your-gen3-commons.org
GEN3_FILE_DOWNLOAD_ENDPOINT=/user/data/download

# Server Configuration
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO

# CORS (comma-separated origins)
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.com

# Security
RATE_LIMIT_PER_MINUTE=100
```

### 3. Run with Docker (Recommended)

```bash
docker-compose up -d
```

Service will be available at `http://localhost:8000`

### 4. Run Locally (Development)

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py
```

## API Usage

### Authentication

All file endpoints require a Bearer token in the Authorization header:

```bash
Authorization: Bearer <user_gen3_token>
```

### Download File

```bash
GET /api/files/{file_id}
```

**Example:**

```bash
curl -H "Authorization: Bearer your_gen3_token_here" \
     http://localhost:8000/api/files/dg.1234/abc-def-ghi-jkl \
     --output downloaded_file.dat
```

**Frontend Example (JavaScript):**

```javascript
async function downloadFile(fileId, userToken) {
  const response = await fetch(
    `http://localhost:8000/api/files/${fileId}`,
    {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'X-Correlation-ID': generateCorrelationId() // Optional
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }
  
  // Stream to download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = response.headers.get('content-disposition')?.split('filename=')[1] || fileId;
  a.click();
}
```

### Get File Metadata (HEAD Request)

```bash
HEAD /api/files/{file_id}
```

Returns headers with file size and metadata without downloading:

```bash
curl -I -H "Authorization: Bearer your_gen3_token_here" \
     http://localhost:8000/api/files/dg.1234/abc-def-ghi-jkl
```

## API Documentation

Interactive API documentation available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Health Checks

### Basic Health Check

```bash
GET /health
```

```json
{
  "status": "ok",
  "timestamp": "2026-03-06T12:00:00.000000",
  "service": "gen3-file-proxy"
}
```

### Gen3 Connectivity Check

```bash
GET /health/gen3
```

```json
{
  "status": "ok",
  "timestamp": "2026-03-06T12:00:00.000000",
  "gen3_api": "https://your-gen3-commons.org",
  "gen3_reachable": true,
  "gen3_version": "2024.01"
}
```

### Simple Ping

```bash
GET /ping
```

```json
{
  "ping": "pong"
}
```

## Error Handling

The service returns structured JSON errors:

```json
{
  "error": "Access denied to file dg.1234/abc-def",
  "type": "Gen3AuthorizationError",
  "path": "/api/files/dg.1234/abc-def"
}
```

### Status Codes

- `200 OK` - File downloaded successfully
- `401 Unauthorized` - Invalid or expired token
- `403 Forbidden` - User lacks permission for file
- `404 Not Found` - File doesn't exist
- `429 Too Many Requests` - Rate limit exceeded
- `502 Bad Gateway` - Gen3 API error
- `503 Service Unavailable` - Gen3 API unreachable

## Testing

### Run Unit Tests

```bash
# Basic test run
pytest

# With verbose output
pytest -v

# Run specific test file
pytest tests/test_gen3_client.py
```

### Run with Coverage

```bash
# Generate all coverage reports (HTML, XML, lcov, terminal)
make test-cov

# Or manually with pytest
pytest --cov=. --cov-report=html --cov-report=xml --cov-report=term

# View HTML coverage report
open htmlcov/index.html
```

### Coveralls Integration

```bash
# Upload coverage to Coveralls (requires COVERALLS_REPO_TOKEN)
export COVERALLS_REPO_TOKEN="your_token_here"
make coveralls

# Or manually
pytest --cov=. --cov-report=lcov
coveralls
```

The project includes GitHub Actions workflow that automatically:
- Runs tests on Python 3.11 and 3.12
- Generates coverage reports
- Uploads coverage to Coveralls and Codecov
- Runs on push to main/develop and on pull requests

### Manual Testing

```bash
# Get a test token from Gen3
export TEST_TOKEN="your_test_token"

# Test health
curl http://localhost:8000/health

# Test Gen3 connectivity
curl http://localhost:8000/health/gen3

# Test file download (replace with valid file ID)
curl -H "Authorization: Bearer $TEST_TOKEN" \
     http://localhost:8000/api/files/your-file-id \
     --output test_download.dat
```

## Deployment

### Production Deployment with Gunicorn

```bash
# Install gunicorn
pip install gunicorn

# Run with multiple workers
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 300 \
  --access-logfile - \
  --error-logfile -
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEN3_API_URL` | Gen3 Commons URL (required) | - |
| `GEN3_FILE_DOWNLOAD_ENDPOINT` | Gen3 download endpoint | `/user/data/download` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |
| `RATE_LIMIT_PER_MINUTE` | Requests per minute per IP | `100` |
| `ENABLE_PROMETHEUS_METRICS` | Enable Prometheus metrics | `false` |

### Docker Production Build

```dockerfile
# Build
docker build -t gen3-file-proxy:latest .

# Run
docker run -d \
  --name gen3-file-proxy \
  -p 8000:8000 \
  --env-file .env \
  gen3-file-proxy:latest
```

## Security Considerations

1. **Token Security**: User tokens are never stored, only used for pass-through authentication
2. **CORS**: Restrict `ALLOWED_ORIGINS` to your actual frontend domains in production
3. **Rate Limiting**: Adjust `RATE_LIMIT_PER_MINUTE` based on your use case
4. **HTTPS**: Always deploy behind HTTPS in production (use nginx/load balancer)
5. **Security Headers**: Automatic security headers added to all responses
6. **Logging**: All requests logged with correlation IDs for audit trails

## Monitoring

### Logs

Structured JSON logs include:
- Request method, path, duration
- Correlation IDs for request tracking
- Error details with stack traces
- Client IP addresses

### Metrics (Optional)

Enable Prometheus metrics by setting `ENABLE_PROMETHEUS_METRICS=true`:

```bash
GET /metrics
```

## Troubleshooting

### "Gen3 API unreachable"

- Check `GEN3_API_URL` is correct and accessible
- Verify network connectivity to Gen3 Commons
- Test with: `curl -I https://your-gen3-commons.org/_version`

### "Invalid or expired token"

- Token may be expired (check Gen3 token TTL)
- Ensure token format is correct (JWT or API token)
- Verify token has required scopes

### "Access denied to file"

- User lacks authz for the file's resource
- Check file authz requirements in Gen3 indexd
- Verify user's permissions in Gen3 Arborist

## Architecture Decisions

### Why FastAPI?
- Native async support for efficient streaming
- Auto-generated OpenAPI docs
- Type safety with Pydantic
- High performance (comparable to Node.js)

### Why Proxy vs Signed URLs?
- **Security**: Gen3 URLs never exposed to client
- **Compliance**: Satisfies audit requirements
- **Control**: Can add logging, rate limiting, analytics
- **Flexibility**: Can modify response headers, add transformations

### Why Python vs Node.js?
- Gen3 SDK is Python-only (no official Node.js SDK)
- Better Gen3 ecosystem integration
- Simpler async streaming with FastAPI

## Contributing

1. Follow PEP 8 style guide
2. Add type hints to all functions
3. Write tests for new features
4. Update API documentation

## License

[Your License Here]

## Support

For issues or questions, please contact [your-team@example.com]
