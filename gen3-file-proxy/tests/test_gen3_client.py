"""Tests for Gen3 client."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from services.gen3_client import Gen3Client
from utils.exceptions import (
    Gen3AuthenticationError,
    Gen3AuthorizationError,
    Gen3NotFoundError,
    Gen3ServiceError
)


@pytest.fixture
def gen3_client():
    """Create Gen3Client instance for testing."""
    return Gen3Client()


@pytest.fixture
def mock_token():
    """Mock Gen3 access token."""
    return "mock_gen3_token_1234567890"


@pytest.mark.asyncio
async def test_verify_token_success(gen3_client, mock_token):
    """Test successful token verification."""
    with patch("httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(
            return_value=mock_response
        )
        
        result = await gen3_client.verify_token(mock_token)
        assert result is True


@pytest.mark.asyncio
async def test_verify_token_invalid(gen3_client, mock_token):
    """Test token verification with invalid token."""
    with patch("httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 401
        
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(
            return_value=mock_response
        )
        
        with pytest.raises(Gen3AuthenticationError):
            await gen3_client.verify_token(mock_token)


@pytest.mark.asyncio
async def test_get_file_metadata_success(gen3_client, mock_token):
    """Test successful file metadata retrieval."""
    file_id = "test-file-123"
    expected_metadata = {
        "did": file_id,
        "size": 1024000,
        "file_name": "test.dat",
        "authz": ["/programs/test/projects/test"],
        "md5sum": "abc123"
    }
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = expected_metadata
        mock_response.raise_for_status = MagicMock()
        
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(
            return_value=mock_response
        )
        
        metadata = await gen3_client.get_file_metadata(file_id, mock_token)
        assert metadata == expected_metadata
        assert metadata["size"] == 1024000


@pytest.mark.asyncio
async def test_get_file_metadata_not_found(gen3_client, mock_token):
    """Test file metadata retrieval with non-existent file."""
    file_id = "non-existent-file"
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 404
        
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(
            return_value=mock_response
        )
        
        with pytest.raises(Gen3NotFoundError):
            await gen3_client.get_file_metadata(file_id, mock_token)


@pytest.mark.asyncio
async def test_check_file_authz_open_access(gen3_client, mock_token):
    """Test authorization check for open access file."""
    file_id = "open-file-123"
    
    with patch.object(gen3_client, "get_file_metadata") as mock_get_metadata:
        mock_get_metadata.return_value = {
            "did": file_id,
            "authz": []  # Empty authz = open access
        }
        
        has_access, resource = await gen3_client.check_file_authz(file_id, mock_token)
        assert has_access is True
        assert resource is None


@pytest.mark.asyncio
async def test_check_file_authz_with_permissions(gen3_client, mock_token):
    """Test authorization check with required permissions."""
    file_id = "protected-file-123"
    resource_path = "/programs/test/projects/test"
    
    with patch.object(gen3_client, "get_file_metadata") as mock_get_metadata:
        mock_get_metadata.return_value = {
            "did": file_id,
            "authz": [resource_path]
        }
        
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"auth": True}
            mock_response.raise_for_status = MagicMock()
            
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )
            
            has_access, returned_resource = await gen3_client.check_file_authz(
                file_id, mock_token
            )
            assert has_access is True
            assert returned_resource == resource_path


@pytest.mark.asyncio
async def test_get_file_headers(gen3_client, mock_token):
    """Test file headers retrieval."""
    file_id = "test-file-123"
    
    with patch.object(gen3_client, "get_file_metadata") as mock_get_metadata:
        mock_get_metadata.return_value = {
            "did": file_id,
            "size": 2048000,
            "file_name": "data.csv"
        }
        
        headers = await gen3_client.get_file_headers(file_id, mock_token)
        
        assert headers["Content-Length"] == "2048000"
        assert "data.csv" in headers["Content-Disposition"]
        assert headers["Content-Type"] == "application/octet-stream"


@pytest.mark.asyncio
async def test_stream_file_access_denied(gen3_client, mock_token):
    """Test file streaming with access denied."""
    file_id = "protected-file-123"
    
    with patch.object(gen3_client, "check_file_authz") as mock_check_authz:
        mock_check_authz.return_value = (False, None)
        
        with pytest.raises(Gen3AuthorizationError):
            async for _ in gen3_client.stream_file(file_id, mock_token):
                pass
