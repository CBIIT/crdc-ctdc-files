"""Gen3 client wrapper for authentication and file operations."""
import asyncio
import logging
from typing import AsyncGenerator, Dict, Optional, Tuple
from functools import lru_cache

import httpx
from gen3.auth import Gen3Auth
from gen3.index import Gen3Index

from config import settings
from utils.exceptions import (
    Gen3AuthenticationError,
    Gen3AuthorizationError,
    Gen3NotFoundError,
    Gen3ServiceError
)

logger = logging.getLogger(__name__)


class Gen3Client:
    """Client for interacting with Gen3 API using user tokens."""
    
    def __init__(self):
        """Initialize Gen3 client."""
        self.base_url = settings.gen3_base_url
        self.download_endpoint = settings.gen3_file_download_endpoint
        
    def _create_auth(self, token: str) -> Gen3Auth:
        """Create Gen3Auth instance with user token.
        
        Args:
            token: User's Gen3 access token
            
        Returns:
            Gen3Auth instance configured with user token
        """
        # Gen3Auth expects endpoint and access_token
        auth = Gen3Auth(self.base_url, refresh_token=None)
        # Manually set the access token from user
        auth._access_token = token
        return auth
    
    async def verify_token(self, token: str) -> bool:
        """Verify that the user token is valid.
        
        Args:
            token: User's Gen3 access token
            
        Returns:
            True if token is valid
            
        Raises:
            Gen3AuthenticationError: If token is invalid
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/user/user",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10.0
                )
                
                if response.status_code == 401:
                    raise Gen3AuthenticationError("Invalid or expired token")
                    
                response.raise_for_status()
                return True
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise Gen3AuthenticationError("Invalid or expired token")
            raise Gen3ServiceError(f"Gen3 API error: {str(e)}")
        except httpx.RequestError as e:
            raise Gen3ServiceError(f"Failed to connect to Gen3: {str(e)}")
    
    async def get_file_metadata(self, file_id: str, token: str) -> Dict:
        """Get file metadata including authz info from Gen3 indexd.
        
        Args:
            file_id: Gen3 file GUID or DID
            token: User's Gen3 access token
            
        Returns:
            Dictionary with file metadata (size, hash, authz, urls)
            
        Raises:
            Gen3NotFoundError: If file doesn't exist
            Gen3AuthorizationError: If user lacks access
            Gen3ServiceError: On API errors
        """
        try:
            async with httpx.AsyncClient() as client:
                # Query indexd for file metadata
                response = await client.get(
                    f"{self.base_url}/index/index/{file_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10.0
                )
                
                if response.status_code == 404:
                    raise Gen3NotFoundError(f"File {file_id} not found")
                elif response.status_code == 403:
                    raise Gen3AuthorizationError(f"Access denied to file {file_id}")
                elif response.status_code == 401:
                    raise Gen3AuthenticationError("Invalid or expired token")
                    
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise Gen3NotFoundError(f"File {file_id} not found")
            elif e.response.status_code == 403:
                raise Gen3AuthorizationError(f"Access denied to file {file_id}")
            elif e.response.status_code == 401:
                raise Gen3AuthenticationError("Invalid or expired token")
            raise Gen3ServiceError(f"Gen3 API error: {str(e)}")
        except httpx.RequestError as e:
            raise Gen3ServiceError(f"Failed to connect to Gen3: {str(e)}")
    
    async def check_file_authz(self, file_id: str, token: str) -> Tuple[bool, Optional[str]]:
        """Check if user has authorization to download file.
        
        Args:
            file_id: Gen3 file GUID or DID
            token: User's Gen3 access token
            
        Returns:
            Tuple of (has_access: bool, resource_path: Optional[str])
            
        Raises:
            Gen3NotFoundError: If file doesn't exist
            Gen3ServiceError: On API errors
        """
        try:
            metadata = await self.get_file_metadata(file_id, token)
            
            # Check if file has authz requirements
            authz_list = metadata.get("authz", [])
            
            # Empty authz means open access
            if not authz_list:
                logger.info(f"File {file_id} has open access")
                return True, None
            
            # If authz is required, verify user access via arborist
            async with httpx.AsyncClient() as client:
                # Check each authz resource
                for resource in authz_list:
                    response = await client.post(
                        f"{self.base_url}/arborist/auth/request",
                        headers={"Authorization": f"Bearer {token}"},
                        json={
                            "user": {"token": token},
                            "requests": [{
                                "resource": resource,
                                "action": {"service": "fence", "method": "read"}
                            }]
                        },
                        timeout=10.0
                    )
                    
                    if response.status_code == 401:
                        raise Gen3AuthenticationError("Invalid or expired token")
                    
                    response.raise_for_status()
                    result = response.json()
                    
                    # Check if access granted
                    if result.get("auth") is True:
                        logger.info(f"User authorized for file {file_id} via resource {resource}")
                        return True, resource
            
            # No matching authorization found
            logger.warning(f"User not authorized for file {file_id}")
            return False, None
            
        except (Gen3NotFoundError, Gen3AuthenticationError):
            raise
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise Gen3AuthenticationError("Invalid or expired token")
            raise Gen3ServiceError(f"Gen3 authz check failed: {str(e)}")
        except httpx.RequestError as e:
            raise Gen3ServiceError(f"Failed to connect to Gen3: {str(e)}")
    
    async def stream_file(
        self, 
        file_id: str, 
        token: str,
        chunk_size: int = 8192
    ) -> AsyncGenerator[bytes, None]:
        """Stream file from Gen3 in chunks.
        
        Args:
            file_id: Gen3 file GUID or DID
            token: User's Gen3 access token
            chunk_size: Size of chunks to stream (default 8KB)
            
        Yields:
            Bytes chunks of the file
            
        Raises:
            Gen3NotFoundError: If file doesn't exist
            Gen3AuthorizationError: If user lacks access
            Gen3ServiceError: On API errors
        """
        # First verify authz
        has_access, _ = await self.check_file_authz(file_id, token)
        if not has_access:
            raise Gen3AuthorizationError(f"Access denied to file {file_id}")
        
        # Build download URL
        download_url = f"{self.base_url}{self.download_endpoint}/{file_id}"
        
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream(
                    "GET",
                    download_url,
                    headers={"Authorization": f"Bearer {token}"}
                ) as response:
                    if response.status_code == 404:
                        raise Gen3NotFoundError(f"File {file_id} not found")
                    elif response.status_code == 403:
                        raise Gen3AuthorizationError(f"Access denied to file {file_id}")
                    elif response.status_code == 401:
                        raise Gen3AuthenticationError("Invalid or expired token")
                    
                    response.raise_for_status()
                    
                    # Stream file in chunks
                    async for chunk in response.aiter_bytes(chunk_size=chunk_size):
                        yield chunk
                        
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise Gen3NotFoundError(f"File {file_id} not found")
            elif e.response.status_code == 403:
                raise Gen3AuthorizationError(f"Access denied to file {file_id}")
            elif e.response.status_code == 401:
                raise Gen3AuthenticationError("Invalid or expired token")
            raise Gen3ServiceError(f"Gen3 download failed: {str(e)}")
        except httpx.RequestError as e:
            raise Gen3ServiceError(f"Failed to download from Gen3: {str(e)}")
    
    async def get_file_headers(self, file_id: str, token: str) -> Dict[str, str]:
        """Get headers for file download (Content-Type, Content-Length, etc.).
        
        Args:
            file_id: Gen3 file GUID or DID
            token: User's Gen3 access token
            
        Returns:
            Dictionary of headers to set on response
        """
        try:
            metadata = await self.get_file_metadata(file_id, token)
            
            headers = {}
            
            # Set Content-Length if available
            if "size" in metadata:
                headers["Content-Length"] = str(metadata["size"])
            
            # Set Content-Disposition with filename if available
            filename = metadata.get("file_name") or file_id
            headers["Content-Disposition"] = f'attachment; filename="{filename}"'
            
            # Set Content-Type (default to octet-stream)
            headers["Content-Type"] = "application/octet-stream"
            
            return headers
            
        except Exception as e:
            logger.warning(f"Failed to get file headers: {str(e)}")
            # Return minimal headers on error
            return {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": f'attachment; filename="{file_id}"'
            }


# Global client instance
@lru_cache()
def get_gen3_client() -> Gen3Client:
    """Get singleton Gen3 client instance."""
    return Gen3Client()
