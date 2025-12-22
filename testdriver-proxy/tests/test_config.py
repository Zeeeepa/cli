"""
Tests for configuration module
"""

import pytest
import os
from testdriver_proxy.config import Config


class TestConfig:
    """Test Config class"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = Config()
        
        assert config.host == "0.0.0.0"
        assert config.port == 8000
        assert config.default_model == "glm-4.5"
        assert config.vision_model == "glm-4.5v"
        assert config.max_tokens == 2000
        assert config.temperature == 0.7
        assert config.timeout == 60
        assert config.max_retries == 3
        assert config.log_level == "INFO"
        assert config.log_requests is True
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = Config(
            host="127.0.0.1",
            port=9000,
            max_tokens=4000,
            temperature=0.5,
        )
        
        assert config.host == "127.0.0.1"
        assert config.port == 9000
        assert config.max_tokens == 4000
        assert config.temperature == 0.5
    
    def test_from_env(self, monkeypatch):
        """Test loading from environment variables"""
        monkeypatch.setenv("HOST", "192.168.1.1")
        monkeypatch.setenv("PORT", "7000")
        monkeypatch.setenv("ZAI_API_KEY", "test-key-123")
        monkeypatch.setenv("MAX_TOKENS", "3000")
        monkeypatch.setenv("TEMPERATURE", "0.9")
        monkeypatch.setenv("LOG_LEVEL", "DEBUG")
        monkeypatch.setenv("LOG_REQUESTS", "false")
        
        config = Config.from_env()
        
        assert config.host == "192.168.1.1"
        assert config.port == 7000
        assert config.zai_api_key == "test-key-123"
        assert config.max_tokens == 3000
        assert config.temperature == 0.9
        assert config.log_level == "DEBUG"
        assert config.log_requests is False
    
    def test_validate_valid_config(self):
        """Test validation of valid configuration"""
        config = Config()
        config.validate()  # Should not raise
    
    def test_validate_invalid_port(self):
        """Test validation with invalid port"""
        config = Config(port=0)
        with pytest.raises(ValueError, match="Invalid port"):
            config.validate()
        
        config = Config(port=70000)
        with pytest.raises(ValueError, match="Invalid port"):
            config.validate()
    
    def test_validate_invalid_max_tokens(self):
        """Test validation with invalid max_tokens"""
        config = Config(max_tokens=0)
        with pytest.raises(ValueError, match="max_tokens must be positive"):
            config.validate()
        
        config = Config(max_tokens=-100)
        with pytest.raises(ValueError, match="max_tokens must be positive"):
            config.validate()
    
    def test_validate_invalid_temperature(self):
        """Test validation with invalid temperature"""
        config = Config(temperature=-0.1)
        with pytest.raises(ValueError, match="temperature must be between 0 and 2"):
            config.validate()
        
        config = Config(temperature=2.1)
        with pytest.raises(ValueError, match="temperature must be between 0 and 2"):
            config.validate()
    
    def test_validate_invalid_timeout(self):
        """Test validation with invalid timeout"""
        config = Config(timeout=0)
        with pytest.raises(ValueError, match="timeout must be positive"):
            config.validate()
        
        config = Config(timeout=-10)
        with pytest.raises(ValueError, match="timeout must be positive"):
            config.validate()
    
    def test_edge_case_temperature(self):
        """Test edge cases for temperature"""
        config = Config(temperature=0.0)
        config.validate()  # Should pass
        
        config = Config(temperature=2.0)
        config.validate()  # Should pass
    
    def test_edge_case_port(self):
        """Test edge cases for port"""
        config = Config(port=1)
        config.validate()  # Should pass
        
        config = Config(port=65535)
        config.validate()  # Should pass

