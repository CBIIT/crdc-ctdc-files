"""Main FastAPI application."""
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from config import settings
from routes import files, health
from middleware.auth import RequestLoggingMiddleware, SecurityHeadersMiddleware
from middleware.rate_limit import limiter, rate_limit_exceeded_handler
from utils.error_handlers import register_error_handlers

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Gen3 File Proxy Service",
    description="Microservice for streaming Gen3 files with user-specific permissions",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiter state
app.state.limiter = limiter

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "HEAD", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Correlation-ID"],
    expose_headers=["X-Correlation-ID", "Content-Disposition", "Content-Length"]
)

# Add custom middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Register error handlers
register_error_handlers(app)
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Register routes
app.include_router(health.router)
app.include_router(files.router)


@app.on_event("startup")
async def startup_event():
    """Log startup information."""
    logger.info(f"Starting Gen3 File Proxy Service")
    logger.info(f"Gen3 API: {settings.gen3_base_url}")
    logger.info(f"CORS Origins: {settings.cors_origins}")
    logger.info(f"Rate Limit: {settings.rate_limit_per_minute}/minute")
    logger.info(f"Log Level: {settings.log_level}")


@app.on_event("shutdown")
async def shutdown_event():
    """Log shutdown information."""
    logger.info("Shutting down Gen3 File Proxy Service")


@app.get("/")
async def root():
    """Root endpoint with service info.
    
    Returns:
        Service information and links
    """
    return {
        "service": "Gen3 File Proxy",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "api": "/api/files/{file_id}"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower()
    )
