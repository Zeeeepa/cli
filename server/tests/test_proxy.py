"""
Tests for proxy server
"""

import pytest
import json
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from testdriver_proxy.proxy import create_app, ZAIProxy
from testdriver_proxy.config import Config
from testdriver_proxy.models import ChatCompletionRequest, Message


@pytest.fixture
def config():
    """Test configuration"""
    return Config(
        host="127.0.0.1",
        port=8000,
        zai_api_key="test-key",
        log_requests=False,
    )


@pytest.fixture
def app(config):
    """Test FastAPI application"""
    return create_app(config)


@pytest.fixture
def client(app):
    """Test client"""
    return TestClient(app)


class TestProxyEndpoints:
    """Test proxy API endpoints"""
    
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "TestDriver Proxy"
        assert data["status"] == "operational"
    
    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_list_models_endpoint(self, client):
        """Test list models endpoint"""
        response = client.get("/v1/models")
        assert response.status_code == 200
        data = response.json()
        assert data["object"] == "list"
        assert len(data["data"]) == 2
        
        model_ids = [m["id"] for m in data["data"]]
        assert "glm-4.5" in model_ids
        assert "glm-4.5v" in model_ids


class TestChatCompletions:
    """Test chat completions endpoint"""
    
    @patch("testdriver_proxy.proxy.httpx.AsyncClient")
    def test_non_streaming_completion(self, mock_client_class, client, config):
        """Test non-streaming chat completion"""
        # Mock response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "id": "chatcmpl-test123",
            "created": 1234567890,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "Hello!"},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 5,
                "total_tokens": 15,
            },
        }
        mock_response.raise_for_status = MagicMock()
        
        # Mock client
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client_class.return_value = mock_client
        
        # Make request
        request_data = {
            "model": "glm-4.5",
            "messages": [{"role": "user", "content": "Hello"}],
            "temperature": 0.7,
            "stream": False,
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "chatcmpl-test123"
        assert data["object"] == "chat.completion"
        assert len(data["choices"]) == 1
        assert data["choices"][0]["message"]["content"] == "Hello!"
        assert data["usage"]["total_tokens"] == 15
    
    def test_invalid_request(self, client):
        """Test invalid request"""
        request_data = {
            "model": "glm-4.5",
            # Missing required 'messages' field
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        assert response.status_code == 422  # Validation error
    
    def test_invalid_message_role(self, client):
        """Test request with invalid message role"""
        request_data = {
            "model": "glm-4.5",
            "messages": [{"role": "invalid_role", "content": "Hello"}],
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        assert response.status_code == 422


class TestZAIProxy:
    """Test ZAIProxy class"""
    
    def test_proxy_initialization(self, config):
        """Test proxy initialization"""
        proxy = ZAIProxy(config)
        assert proxy.config == config
        assert proxy.client is not None
    
    @pytest.mark.asyncio
    async def test_transform_request_basic(self, config):
        """Test basic request transformation"""
        proxy = ZAIProxy(config)
        
        request = ChatCompletionRequest(
            model="glm-4.5",
            messages=[Message(role="user", content="Hello")],
        )
        
        transformed = await proxy.transform_request(request)
        
        assert transformed["model"] == "glm-4.5"
        assert len(transformed["messages"]) == 1
        assert transformed["temperature"] == 0.7
        assert transformed["stream"] is False
    
    @pytest.mark.asyncio
    async def test_transform_request_with_options(self, config):
        """Test request transformation with options"""
        proxy = ZAIProxy(config)
        
        request = ChatCompletionRequest(
            model="glm-4.5",
            messages=[Message(role="user", content="Hello")],
            temperature=0.5,
            max_tokens=1000,
            top_p=0.9,
            stop=["END", "STOP"],
        )
        
        transformed = await proxy.transform_request(request)
        
        assert transformed["temperature"] == 0.5
        assert transformed["max_tokens"] == 1000
        assert transformed["top_p"] == 0.9
        assert transformed["stop"] == ["END", "STOP"]
    
    @pytest.mark.asyncio
    async def test_transform_request_stop_string(self, config):
        """Test request transformation with stop as string"""
        proxy = ZAIProxy(config)
        
        request = ChatCompletionRequest(
            model="glm-4.5",
            messages=[Message(role="user", content="Hello")],
            stop="END",
        )
        
        transformed = await proxy.transform_request(request)
        
        assert transformed["stop"] == ["END"]


class TestErrorHandling:
    """Test error handling"""
    
    @patch("testdriver_proxy.proxy.httpx.AsyncClient")
    def test_zai_api_error(self, mock_client_class, client):
        """Test handling Z.ai API error"""
        # Mock error response
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(side_effect=Exception("API Error"))
        mock_client_class.return_value = mock_client
        
        request_data = {
            "model": "glm-4.5",
            "messages": [{"role": "user", "content": "Hello"}],
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        assert response.status_code == 500


class TestStreamingResponse:
    """Test streaming response handling"""
    
    @patch("testdriver_proxy.proxy.httpx.AsyncClient")
    def test_streaming_enabled(self, mock_client_class, client):
        """Test streaming response request"""
        # Mock streaming response
        async def mock_aiter_lines():
            yield "data: " + json.dumps({
                "id": "chatcmpl-test",
                "created": 123456,
                "choices": [{
                    "index": 0,
                    "delta": {"content": "Hello"},
                    "finish_reason": None,
                }],
            })
            yield "data: [DONE]"
        
        mock_response = MagicMock()
        mock_response.aiter_lines = mock_aiter_lines
        mock_response.raise_for_status = MagicMock()
        
        mock_stream_context = MagicMock()
        mock_stream_context.__aenter__ = AsyncMock(return_value=mock_response)
        mock_stream_context.__aexit__ = AsyncMock()
        
        mock_client = AsyncMock()
        mock_client.stream = MagicMock(return_value=mock_stream_context)
        mock_client_class.return_value = mock_client
        
        request_data = {
            "model": "glm-4.5",
            "messages": [{"role": "user", "content": "Hello"}],
            "stream": True,
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"


class TestMultimodalSupport:
    """Test multimodal message support"""
    
    @patch("testdriver_proxy.proxy.httpx.AsyncClient")
    def test_vision_model_request(self, mock_client_class, client):
        """Test request with vision model"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "id": "chatcmpl-vision",
            "created": 1234567890,
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": "I see an image."},
                "finish_reason": "stop",
            }],
            "usage": {"prompt_tokens": 100, "completion_tokens": 10, "total_tokens": 110},
        }
        mock_response.raise_for_status = MagicMock()
        
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client_class.return_value = mock_client
        
        request_data = {
            "model": "glm-4.5v",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "What's in this image?"},
                        {"type": "image_url", "image_url": {"url": "https://example.com/img.jpg"}},
                    ],
                }
            ],
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["model"] == "glm-4.5v"

