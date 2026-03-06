"""Global error handlers for FastAPI."""
import logging
from typing import Union

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from utils.exceptions import (
    Gen3BaseError,
    Gen3AuthenticationError,
    Gen3AuthorizationError,
    Gen3NotFoundError,
    Gen3ServiceError
)

logger = logging.getLogger(__name__)


async def gen3_error_handler(request: Request, exc: Gen3BaseError) -> JSONResponse:
    """Handle Gen3-specific errors.
    
    Args:
        request: The request that caused the error
        exc: The Gen3 exception
        
    Returns:
        JSON response with error details
    """
    logger.error(
        f"Gen3 error: {exc.message}",
        extra={
            "path": request.url.path,
            "status_code": exc.status_code,
            "error_type": type(exc).__name__
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "type": type(exc).__name__,
            "path": request.url.path
        }
    )


async def http_exception_handler(
    request: Request, 
    exc: StarletteHTTPException
) -> JSONResponse:
    """Handle HTTP exceptions.
    
    Args:
        request: The request that caused the error
        exc: The HTTP exception
        
    Returns:
        JSON response with error details
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "path": request.url.path
        }
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
) -> JSONResponse:
    """Handle request validation errors.
    
    Args:
        request: The request that caused the error
        exc: The validation exception
        
    Returns:
        JSON response with validation error details
    """
    logger.warning(
        f"Validation error",
        extra={
            "path": request.url.path,
            "errors": exc.errors()
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "details": exc.errors(),
            "path": request.url.path
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions.
    
    Args:
        request: The request that caused the error
        exc: The exception
        
    Returns:
        JSON response with generic error message
    """
    logger.error(
        f"Unexpected error: {str(exc)}",
        extra={
            "path": request.url.path,
            "error_type": type(exc).__name__
        },
        exc_info=True
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "path": request.url.path
        }
    )


def register_error_handlers(app):
    """Register all error handlers with the FastAPI app.
    
    Args:
        app: FastAPI application instance
    """
    # Gen3-specific errors
    app.add_exception_handler(Gen3BaseError, gen3_error_handler)
    app.add_exception_handler(Gen3AuthenticationError, gen3_error_handler)
    app.add_exception_handler(Gen3AuthorizationError, gen3_error_handler)
    app.add_exception_handler(Gen3NotFoundError, gen3_error_handler)
    app.add_exception_handler(Gen3ServiceError, gen3_error_handler)
    
    # HTTP exceptions
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    
    # Validation errors
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # Catch-all for unexpected errors
    app.add_exception_handler(Exception, general_exception_handler)
