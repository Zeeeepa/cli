"""
Configuration management for TestDriver Proxy
"""

from typing import Optional
from dataclasses import dataclass, field
import os


@dataclass
class Config:
    """Configuration for Z.ai proxy server"""
    
    # Server settings
    host: str = field(default="0.0.0.0")
    port: int = field(default=8000)
    
    # Z.ai API settings
    zai_api_key: Optional[str] = field(default=None)
    zai_base_url: str = field(default="https://api.z.ai/v1")
    
    # Model settings
    default_model: str = field(default="glm-4.5")
    vision_model: str = field(default="glm-4.5v")
    max_tokens: int = field(default=2000)
    temperature: float = field(default=0.7)
    
    # Request settings
    timeout: int = field(default=60)
    max_retries: int = field(default=3)
    
    # Logging
    log_level: str = field(default="INFO")
    log_requests: bool = field(default=True)
    
    @classmethod
    def from_env(cls) -> "Config":
        """Load configuration from environment variables"""
        return cls(
            host=os.getenv("HOST", "0.0.0.0"),
            port=int(os.getenv("PORT", "8000")),
            zai_api_key=os.getenv("ZAI_API_KEY"),
            zai_base_url=os.getenv("ZAI_BASE_URL", "https://api.z.ai/v1"),
            default_model=os.getenv("DEFAULT_MODEL", "glm-4.5"),
            vision_model=os.getenv("VISION_MODEL", "glm-4.5v"),
            max_tokens=int(os.getenv("MAX_TOKENS", "2000")),
            temperature=float(os.getenv("TEMPERATURE", "0.7")),
            timeout=int(os.getenv("TIMEOUT", "60")),
            max_retries=int(os.getenv("MAX_RETRIES", "3")),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            log_requests=os.getenv("LOG_REQUESTS", "true").lower() == "true",
        )
    
    def validate(self) -> None:
        """Validate configuration"""
        if self.port < 1 or self.port > 65535:
            raise ValueError(f"Invalid port: {self.port}")
        
        if self.max_tokens < 1:
            raise ValueError(f"max_tokens must be positive: {self.max_tokens}")
        
        if not 0 <= self.temperature <= 2:
            raise ValueError(f"temperature must be between 0 and 2: {self.temperature}")
        
        if self.timeout < 1:
            raise ValueError(f"timeout must be positive: {self.timeout}")

