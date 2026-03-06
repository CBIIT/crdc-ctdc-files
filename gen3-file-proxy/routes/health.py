"""Health check and observability routes."""
import logging
from datetime import datetime
from typing import Dict

import httpx
from fastapi import APIRouter, HTTPException

from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> Dict:
    """Basic health check endpoint.
    
    Returns:
        Health status and timestamp
    """
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "gen3-file-proxy"
    }


@router.get("/health/gen3")
async def gen3_health_check() -> Dict:
    """Check Gen3 API connectivity.
    
    Returns:
        Gen3 API health status
        
    Raises:
        HTTPException: If Gen3 API is unreachable
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try to reach Gen3 API version endpoint
            response = await client.get(
                f"{settings.gen3_base_url}/_version",
            )
            response.raise_for_status()
            
            version_info = response.json()
            
            return {
                "status": "ok",
                "timestamp": datetime.utcnow().isoformat(),
                "gen3_api": settings.gen3_base_url,
                "gen3_reachable": True,
                "gen3_version": version_info.get("version", "unknown")
            }
            
    except httpx.RequestError as e:
        logger.error(f"Gen3 API unreachable: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Gen3 API unreachable: {str(e)}"
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"Gen3 API error: {str(e)}")
        raise HTTPException(
            status_code=502,
            detail=f"Gen3 API error: {e.response.status_code}"
        )


@router.get("/version")
async def version() -> Dict:
    """Get service version and configuration info.
    
    Returns:
        Service version and configuration
    """
    return {
        "service": "gen3-file-proxy",
        "version": "1.0.0",
        "gen3_api": settings.gen3_base_url,
        "rate_limit": f"{settings.rate_limit_per_minute}/minute"
    }


@router.get("/ping")
async def ping() -> Dict:
    """Simple ping endpoint for load balancers.
    
    Returns:
        Pong response
    """
    return {"ping": "pong"}
