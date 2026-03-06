"""File download routes."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from services.gen3_client import Gen3Client, get_gen3_client
from utils.exceptions import (
    Gen3AuthenticationError,
    Gen3AuthorizationError,
    Gen3NotFoundError,
    Gen3ServiceError
)
from middleware.auth import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/files", tags=["files"])
security = HTTPBearer()


@router.get("/{file_id}")
async def download_file(
    file_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    gen3_client: Gen3Client = Depends(get_gen3_client),
    correlation_id: Optional[str] = Header(None, alias="X-Correlation-ID")
):
    """Download a file from Gen3 by streaming through this proxy.
    
    Args:
        file_id: Gen3 file GUID/DID
        credentials: Bearer token from Authorization header
        gen3_client: Gen3 client instance
        correlation_id: Optional correlation ID for request tracking
        
    Returns:
        StreamingResponse with file content
        
    Raises:
        HTTPException: On authentication, authorization, or service errors
    """
    token = credentials.credentials
    
    # Log request
    log_context = {
        "file_id": file_id,
        "correlation_id": correlation_id or "none"
    }
    logger.info(f"File download request", extra=log_context)
    
    try:
        # Verify token is valid
        await gen3_client.verify_token(token)
        
        # Get file headers for response
        headers = await gen3_client.get_file_headers(file_id, token)
        
        # Stream file
        file_stream = gen3_client.stream_file(file_id, token)
        
        logger.info(f"Streaming file {file_id}", extra=log_context)
        
        return StreamingResponse(
            file_stream,
            media_type=headers.get("Content-Type", "application/octet-stream"),
            headers={
                k: v for k, v in headers.items() 
                if k != "Content-Type"
            }
        )
        
    except Gen3AuthenticationError as e:
        logger.warning(f"Authentication failed: {e.message}", extra=log_context)
        raise HTTPException(status_code=401, detail=e.message)
        
    except Gen3AuthorizationError as e:
        logger.warning(f"Authorization failed: {e.message}", extra=log_context)
        raise HTTPException(status_code=403, detail=e.message)
        
    except Gen3NotFoundError as e:
        logger.warning(f"File not found: {e.message}", extra=log_context)
        raise HTTPException(status_code=404, detail=e.message)
        
    except Gen3ServiceError as e:
        logger.error(f"Gen3 service error: {e.message}", extra=log_context)
        raise HTTPException(status_code=502, detail=f"Gen3 service error: {e.message}")
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", extra=log_context, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.head("/{file_id}")
async def get_file_info(
    file_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    gen3_client: Gen3Client = Depends(get_gen3_client)
):
    """Get file metadata via HEAD request (useful for checking size before download).
    
    Args:
        file_id: Gen3 file GUID/DID
        credentials: Bearer token from Authorization header
        gen3_client: Gen3 client instance
        
    Returns:
        Response with headers only (no body)
        
    Raises:
        HTTPException: On authentication, authorization, or service errors
    """
    token = credentials.credentials
    
    try:
        # Verify token is valid
        await gen3_client.verify_token(token)
        
        # Check authorization
        has_access, _ = await gen3_client.check_file_authz(file_id, token)
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get headers
        headers = await gen3_client.get_file_headers(file_id, token)
        
        return StreamingResponse(
            iter([]),  # Empty body for HEAD request
            headers=headers
        )
        
    except Gen3AuthenticationError as e:
        raise HTTPException(status_code=401, detail=e.message)
        
    except Gen3AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)
        
    except Gen3NotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
        
    except Gen3ServiceError as e:
        raise HTTPException(status_code=502, detail=f"Gen3 service error: {e.message}")
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
