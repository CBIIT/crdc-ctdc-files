"""File download routes."""
import logging
import zipfile
import io
from typing import Optional, List
from pydantic import BaseModel

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


class BatchDownloadRequest(BaseModel):
    """Request model for batch file download."""
    file_ids: List[str]
    zip_filename: Optional[str] = "files.zip"


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


@router.post("/batch/download")
async def download_batch_files(
    request: BatchDownloadRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    gen3_client: Gen3Client = Depends(get_gen3_client),
    correlation_id: Optional[str] = Header(None, alias="X-Correlation-ID")
):
    """Download multiple files as a ZIP archive.
    
    Args:
        request: BatchDownloadRequest with list of file_ids
        credentials: Bearer token from Authorization header
        gen3_client: Gen3 client instance
        correlation_id: Optional correlation ID for request tracking
        
    Returns:
        StreamingResponse with ZIP file content
        
    Raises:
        HTTPException: On authentication, authorization, or service errors
    """
    token = credentials.credentials
    file_ids = request.file_ids
    zip_filename = request.zip_filename or "files.zip"
    
    # Log request
    log_context = {
        "file_ids": file_ids,
        "file_count": len(file_ids),
        "correlation_id": correlation_id or "none"
    }
    logger.info(f"Batch download request for {len(file_ids)} files", extra=log_context)
    
    # Validate input
    if not file_ids:
        raise HTTPException(status_code=400, detail="No file_ids provided")
    if len(file_ids) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 files per batch")
    
    try:
        # Verify token is valid
        await gen3_client.verify_token(token)
        
        async def generate_zip():
            """Generate ZIP file with all requested files."""
            buffer = io.BytesIO()
            
            with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                successful_files = 0
                failed_files = []
                
                for idx, file_id in enumerate(file_ids, 1):
                    try:
                        logger.debug(f"Adding file {idx}/{len(file_ids)}: {file_id}", extra=log_context)
                        
                        # Check authorization before downloading
                        has_access, _ = await gen3_client.check_file_authz(file_id, token)
                        if not has_access:
                            logger.warning(f"Access denied to file {file_id}", extra=log_context)
                            failed_files.append({"file_id": file_id, "error": "Access denied"})
                            continue
                        
                        # Get file metadata for proper filename
                        headers = await gen3_client.get_file_headers(file_id, token)
                        filename = headers.get('Content-Disposition', file_id).split('filename=')[-1].strip('"')
                        
                        # Stream file into ZIP
                        file_data = b''
                        async for chunk in gen3_client.stream_file(file_id, token):
                            file_data += chunk
                        
                        # Add to ZIP
                        zip_file.writestr(filename, file_data)
                        successful_files += 1
                        logger.debug(f"Successfully added {filename} to ZIP", extra=log_context)
                        
                    except Gen3AuthorizationError:
                        logger.warning(f"Authorization denied for {file_id}", extra=log_context)
                        failed_files.append({"file_id": file_id, "error": "Authorization denied"})
                    except Gen3NotFoundError:
                        logger.warning(f"File {file_id} not found", extra=log_context)
                        failed_files.append({"file_id": file_id, "error": "File not found"})
                    except Gen3ServiceError as e:
                        logger.error(f"Gen3 service error for {file_id}: {e.message}", extra=log_context)
                        failed_files.append({"file_id": file_id, "error": f"Service error: {e.message}"})
                    except Exception as e:
                        logger.error(f"Error downloading {file_id}: {str(e)}", extra=log_context, exc_info=True)
                        failed_files.append({"file_id": file_id, "error": str(e)})
                
                # Add manifest file if any failures
                if failed_files:
                    manifest = f"DOWNLOAD_MANIFEST.txt"
                    manifest_content = f"""Gen3 File Proxy - Download Manifest
=====================================

Completed: {successful_files}/{len(file_ids)}
Failed: {len(failed_files)}/{len(file_ids)}

Failed Files:
"""
                    for failure in failed_files:
                        manifest_content += f"\n- {failure['file_id']}: {failure['error']}"
                    
                    zip_file.writestr(manifest, manifest_content)
                    logger.warning(f"Batch download completed with {len(failed_files)} failures", extra=log_context)
                else:
                    logger.info(f"Batch download completed successfully for all {successful_files} files", extra=log_context)
            
            # Reset buffer position and yield content
            buffer.seek(0)
            yield buffer.read()
        
        return StreamingResponse(
            generate_zip(),
            media_type='application/zip',
            headers={'Content-Disposition': f'attachment; filename="{zip_filename}"'}
        )
        
    except Gen3AuthenticationError as e:
        logger.warning(f"Authentication failed: {e.message}", extra=log_context)
        raise HTTPException(status_code=401, detail=e.message)
        
    except Gen3ServiceError as e:
        logger.error(f"Gen3 service error: {e.message}", extra=log_context)
        raise HTTPException(status_code=502, detail=f"Gen3 service error: {e.message}")
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", extra=log_context, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
