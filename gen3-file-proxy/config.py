"""Application configuration using Pydantic Settings."""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Gen3 Configuration
    gen3_api_url: str
    gen3_file_download_endpoint: str = "/user/data/download"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"
    
    # CORS Configuration
    allowed_origins: str = "http://localhost:3000"
    
    # Security
    rate_limit_per_minute: int = 100
    
    # Monitoring
    enable_prometheus_metrics: bool = False
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-separated CORS origins."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    @property
    def gen3_base_url(self) -> str:
        """Remove trailing slash from Gen3 URL."""
        return self.gen3_api_url.rstrip("/")


# Global settings instance
settings = Settings()
