"""Rate limiting middleware."""
import logging
from typing import Callable

from fastapi import Request, HTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings

logger = logging.getLogger(__name__)

# Create rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.rate_limit_per_minute}/minute"]
)

# Export rate limit handler
rate_limit_exceeded_handler = _rate_limit_exceeded_handler
