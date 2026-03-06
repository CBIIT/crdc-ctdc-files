"""Tests for file download routes."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch

from main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_token():
    """Mock authorization token."""
    return "Bearer mock_gen3_token_1234567890"


def test_health_check(client):
    """Test basic health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


def test_ping(client):
    """Test ping endpoint."""
    response = client.get("/ping")
    assert response.status_code == 200
    assert response.json() == {"ping": "pong"}


def test_root_endpoint(client):
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Gen3 File Proxy"
    assert "docs" in data


def test_download_file_no_auth(client):
    """Test file download without authentication."""
    response = client.get("/api/files/test-file-123")
    assert response.status_code == 403  # No auth header


@patch("services.gen3_client.Gen3Client.verify_token")
@patch("services.gen3_client.Gen3Client.get_file_headers")
@patch("services.gen3_client.Gen3Client.stream_file")
def test_download_file_success(
    mock_stream,
    mock_headers,
    mock_verify,
    client,
    mock_token
):
    """Test successful file download."""
    # Setup mocks
    mock_verify.return_value = AsyncMock(return_value=True)
    mock_headers.return_value = AsyncMock(return_value={
        "Content-Type": "application/octet-stream",
        "Content-Length": "1024",
        "Content-Disposition": 'attachment; filename="test.dat"'
    })
    
    async def mock_stream_generator():
        yield b"mock file content"
    
    mock_stream.return_value = mock_stream_generator()
    
    # Make request
    response = client.get(
        "/api/files/test-file-123",
        headers={"Authorization": mock_token}
    )
    
    assert response.status_code == 200
    assert response.content == b"mock file content"


def test_download_file_invalid_token(client):
    """Test file download with invalid token."""
    response = client.get(
        "/api/files/test-file-123",
        headers={"Authorization": "Bearer invalid"}
    )
    # Will fail at Gen3 verification
    assert response.status_code in [401, 403, 500]


def test_head_file_no_auth(client):
    """Test HEAD request without authentication."""
    response = client.head("/api/files/test-file-123")
    assert response.status_code == 403


def test_version_endpoint(client):
    """Test version endpoint."""
    response = client.get("/version")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "gen3-file-proxy"
    assert "version" in data
