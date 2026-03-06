# Quick Start Guide - Gen3 File Proxy Service

Get the Gen3 File Proxy service up and running in minutes.

## Prerequisites

- **Docker** (recommended) OR **Python 3.11+**
- Access to a Gen3 Commons instance
- Gen3 user access token

---

## Step 1: Navigate to the Project

```bash
cd gen3-file-proxy
```

## Step 2: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your settings
nano .env  # or use your preferred editor (vim, code, etc.)
```

**Required configuration in `.env`:**

```bash
# Gen3 API Configuration
GEN3_API_URL=https://your-gen3-commons.org
GEN3_FILE_DOWNLOAD_ENDPOINT=/user/data/download

# CORS Configuration (comma-separated origins)
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com

# Server Configuration
PORT=8000
LOG_LEVEL=INFO

# Security
RATE_LIMIT_PER_MINUTE=100
```

---

## Step 3: Choose Your Installation Method

### Option A: Docker (Recommended - Fastest) 🐳

```bash
# Start the service with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

**The service will be running at:** `http://localhost:8000`

---

### Option B: Local Python (Development) 🐍

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the development server
python main.py
```

**The service will be running at:** `http://localhost:8000`

**To stop:** Press `Ctrl+C`

---

### Option C: Use the Quick Start Script 🚀

```bash
# Run the interactive setup script
./quickstart.sh

# Follow the prompts to choose Docker or local installation
```

---

## Step 4: Verify It's Running

```bash
# Check health
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-03-06T12:00:00.000000",
#   "service": "gen3-file-proxy"
# }
```

**View API Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Step 5: Test a File Download

### Get Your Gen3 Token

You need a valid Gen3 access token. Get it from:
- Gen3 Commons UI: Profile → Create API Key
- Your authentication system
- Gen3 SDK: `gen3 auth`

### Download a File

```bash
# Set your Gen3 token
export GEN3_TOKEN="your_gen3_token_here"

# Download a file (replace YOUR_FILE_ID with actual Gen3 file GUID)
curl -H "Authorization: Bearer $GEN3_TOKEN" \
     http://localhost:8000/api/files/YOUR_FILE_ID \
     --output downloaded_file.dat
```

### Example with Real File ID

```bash
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..." \
     http://localhost:8000/api/files/dg.1234/abc-def-ghi-jkl \
     --output myfile.dat
```

---

## Step 6: Integration with Frontend

### JavaScript/React Example

```javascript
async function downloadFile(fileId, userToken) {
  const response = await fetch(
    `http://localhost:8000/api/files/${fileId}`,
    {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = response.headers.get('content-disposition')?.split('filename=')[1] || fileId;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Usage
downloadFile('dg.1234/abc-def-ghi', userToken);
```

See [examples/frontend_integration.js](examples/frontend_integration.js) for more examples.

---

## Common Issues & Troubleshooting

### Issue: "Gen3 API unreachable"

**Solution:**
- Check `GEN3_API_URL` is correct in `.env`
- Verify network connectivity to Gen3 Commons
- Test: `curl -I https://your-gen3-commons.org/_version`

### Issue: "Invalid or expired token"

**Solution:**
- Token may be expired (check Gen3 token TTL)
- Ensure token format is correct (JWT or API token)
- Verify token has required scopes
- Generate a new token from Gen3

### Issue: "Access denied to file"

**Solution:**
- User lacks authorization for the file's resource
- Check file authz requirements in Gen3 indexd
- Verify user's permissions in Gen3 Arborist

### Issue: Docker container exits immediately

**Solution:**
- Check `.env` file exists and has `GEN3_API_URL` set
- View logs: `docker-compose logs`
- Ensure port 8000 is not already in use: `lsof -i :8000`

### Issue: Port 8000 already in use

**Solution:**
- Change port in `.env`: `PORT=8001`
- Update docker-compose.yml port mapping
- Or stop other service using port 8000

---

## Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info and links |
| `/health` | GET | Basic health check |
| `/health/gen3` | GET | Gen3 connectivity check |
| `/ping` | GET | Simple ping for load balancers |
| `/version` | GET | Service version info |
| `/api/files/{file_id}` | GET | Download file (requires auth) |
| `/api/files/{file_id}` | HEAD | Get file metadata (requires auth) |
| `/docs` | GET | Interactive API documentation |
| `/redoc` | GET | Alternative API documentation |

---

## Running Tests

```bash
# Basic tests
pytest

# With coverage
pytest --cov=. --cov-report=html

# View coverage report
open htmlcov/index.html
```

---

## Production Deployment

For production, use Gunicorn with multiple workers:

```bash
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 300 \
  --access-logfile - \
  --error-logfile -
```

Or use Docker with the provided `Dockerfile` and deploy to your container orchestration platform (Kubernetes, ECS, etc.).

---

## Next Steps

- ✅ Configure CORS for your frontend domain
- ✅ Set up monitoring and logging
- ✅ Review security settings for production
- ✅ Set up CI/CD with GitHub Actions (workflow included)
- ✅ Enable Coveralls for test coverage tracking

For complete documentation, see [README.md](README.md)

For Coveralls setup, see [COVERALLS_SETUP.md](COVERALLS_SETUP.md)

---

## Need Help?

- **API Documentation**: http://localhost:8000/docs
- **Full README**: [README.md](README.md)
- **Frontend Examples**: [examples/frontend_integration.js](examples/frontend_integration.js)
- **Integration Tests**: [examples/integration_test.py](examples/integration_test.py)

---

**🎉 You're all set! Happy streaming!**
