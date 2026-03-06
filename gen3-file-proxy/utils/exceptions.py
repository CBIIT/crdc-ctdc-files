"""Custom exceptions for Gen3 operations."""
from typing import Optional


class Gen3BaseError(Exception):
    """Base exception for Gen3 errors."""
    
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class Gen3AuthenticationError(Gen3BaseError):
    """Raised when authentication fails (401)."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class Gen3AuthorizationError(Gen3BaseError):
    """Raised when user lacks permission (403)."""
    
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, status_code=403)


class Gen3NotFoundError(Gen3BaseError):
    """Raised when resource not found (404)."""
    
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class Gen3ServiceError(Gen3BaseError):
    """Raised on Gen3 API service errors (500)."""
    
    def __init__(self, message: str = "Gen3 service error"):
        super().__init__(message, status_code=500)
