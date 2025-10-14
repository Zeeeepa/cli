"""
Integration tests with real Z.ai API
"""

import pytest
import os
from fastapi.testclient import TestClient
from testdriver_proxy.proxy import create_app
from testdriver_proxy.config import Config


@pytest.fixture
def config():
    """Load configuration from .env file"""
    return Config(
        host="127.0.0.1",
        port=8000,
        zai_api_key=os.getenv("ZAI_API_KEY", "665b963943b647dc9501dff942afb877.A47LrMc7sgGjyfBJ"),
        zai_base_url=os.getenv("ZAI_BASE_URL", "https://api.z.ai/api/anthropic"),
        default_model="glm-4.5",
        vision_model="glm-4.5V",
        log_requests=True,
    )


@pytest.fixture
def app(config):
    """Create app with real API credentials"""
    return create_app(config)


@pytest.fixture
def client(app):
    """Test client"""
    return TestClient(app)


class TestRealAPIEndpoints:
    """Test endpoints with real Z.ai API"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "TestDriver Proxy"
        assert data["status"] == "operational"
    
    def test_list_models(self, client):
        """Test list models endpoint"""
        response = client.get("/v1/models")
        assert response.status_code == 200
        data = response.json()
        assert data["object"] == "list"
        assert len(data["data"]) >= 2
        
        model_ids = [m["id"] for m in data["data"]]
        assert "glm-4.5" in model_ids
        assert "glm-4.5v" in model_ids


class TestRealAPIChatCompletions:
    """Test chat completions with real Z.ai API"""
    
    @pytest.mark.integration
    def test_simple_chat_completion(self, client):
        """Test simple non-streaming chat completion"""
        request_data = {
            "model": "glm-4.5",
            "messages": [
                {"role": "user", "content": "Say 'Hello World' and nothing else."}
            ],
            "temperature": 0.7,
            "max_tokens": 50,
            "stream": False,
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        print(f"\nResponse status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["object"] == "chat.completion"
        assert data["model"] == "glm-4.5"
        assert "choices" in data
        assert len(data["choices"]) > 0
        
        # Verify message
        choice = data["choices"][0]
        assert "message" in choice
        assert choice["message"]["role"] == "assistant"
        assert len(choice["message"]["content"]) > 0
        
        # Verify usage
        assert "usage" in data
        assert data["usage"]["total_tokens"] > 0
        
        print(f"✅ Assistant response: {choice['message']['content']}")
        print(f"✅ Token usage: {data['usage']}")
    
    @pytest.mark.integration
    def test_streaming_chat_completion(self, client):
        """Test streaming chat completion"""
        request_data = {
            "model": "glm-4.5",
            "messages": [
                {"role": "user", "content": "Count from 1 to 5, one number per line."}
            ],
            "temperature": 0.7,
            "max_tokens": 100,
            "stream": True,
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        print(f"\nStreaming response status: {response.status_code}")
        
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")
        
        # Collect streaming chunks
        chunks = []
        content_parts = []
        
        for line in response.iter_lines():
            if not line:
                continue
            
            line_str = line.decode('utf-8') if isinstance(line, bytes) else line
            print(f"Chunk: {line_str}")
            
            if line_str.startswith("data: "):
                data_str = line_str[6:]
                
                if data_str.strip() == "[DONE]":
                    print("✅ Stream completed with [DONE]")
                    break
                
                try:
                    import json
                    chunk_data = json.loads(data_str)
                    chunks.append(chunk_data)
                    
                    # Extract content from delta
                    if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                        delta = chunk_data["choices"][0].get("delta", {})
                        if "content" in delta:
                            content_parts.append(delta["content"])
                            print(f"  Content: {delta['content']}")
                
                except json.JSONDecodeError:
                    print(f"  Failed to parse: {data_str}")
        
        # Verify we got chunks
        assert len(chunks) > 0, "Should receive at least one chunk"
        
        # Verify first chunk structure
        first_chunk = chunks[0]
        assert "id" in first_chunk
        assert first_chunk["object"] == "chat.completion.chunk"
        assert "choices" in first_chunk
        
        # Verify we got content
        full_content = "".join(content_parts)
        print(f"\n✅ Full streamed content: {full_content}")
        assert len(full_content) > 0, "Should receive content"
    
    @pytest.mark.integration
    def test_vision_model_with_text(self, client):
        """Test vision model with text-only input"""
        request_data = {
            "model": "glm-4.5V",
            "messages": [
                {"role": "user", "content": "What is 2+2? Answer with just the number."}
            ],
            "temperature": 0.5,
            "max_tokens": 30,
            "stream": False,
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        print(f"\nVision model response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["model"] == "glm-4.5V"
        assert len(data["choices"]) > 0
        
        content = data["choices"][0]["message"]["content"]
        print(f"✅ Vision model response: {content}")
        assert len(content) > 0
    
    @pytest.mark.integration
    def test_conversation_with_history(self, client):
        """Test multi-turn conversation"""
        request_data = {
            "model": "glm-4.5",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "My name is Alice."},
                {"role": "assistant", "content": "Hello Alice! Nice to meet you."},
                {"role": "user", "content": "What is my name?"},
            ],
            "temperature": 0.7,
            "max_tokens": 50,
            "stream": False,
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        print(f"\nConversation response status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        content = data["choices"][0]["message"]["content"]
        print(f"✅ Assistant remembers: {content}")
        assert "alice" in content.lower(), "Should remember the user's name"
    
    @pytest.mark.integration
    def test_temperature_variation(self, client):
        """Test different temperature settings"""
        for temp in [0.1, 0.5, 1.0]:
            request_data = {
                "model": "glm-4.5",
                "messages": [
                    {"role": "user", "content": "Say hello."}
                ],
                "temperature": temp,
                "max_tokens": 30,
                "stream": False,
            }
            
            response = client.post("/v1/chat/completions", json=request_data)
            assert response.status_code == 200
            
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            print(f"✅ Temperature {temp}: {content}")
    
    @pytest.mark.integration
    def test_max_tokens_limit(self, client):
        """Test max_tokens parameter"""
        request_data = {
            "model": "glm-4.5",
            "messages": [
                {"role": "user", "content": "Write a long story about a cat."}
            ],
            "temperature": 0.7,
            "max_tokens": 20,  # Very small limit
            "stream": False,
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        tokens_used = data["usage"]["completion_tokens"]
        print(f"✅ Tokens used: {tokens_used} (limit: 20)")
        assert tokens_used <= 20, "Should respect max_tokens limit"
    
    @pytest.mark.integration
    def test_stop_sequence(self, client):
        """Test stop sequence parameter"""
        request_data = {
            "model": "glm-4.5",
            "messages": [
                {"role": "user", "content": "Count: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10"}
            ],
            "temperature": 0.7,
            "max_tokens": 100,
            "stop": ["5"],  # Stop at "5"
            "stream": False,
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        print(f"✅ Stopped content: {content}")
        
        # Check if it stopped (finish_reason should be "stop")
        finish_reason = data["choices"][0].get("finish_reason")
        print(f"✅ Finish reason: {finish_reason}")


class TestErrorHandling:
    """Test error handling with real API"""
    
    def test_invalid_model(self, client):
        """Test request with invalid model"""
        request_data = {
            "model": "invalid-model-xyz",
            "messages": [
                {"role": "user", "content": "Hello"}
            ],
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        print(f"\nInvalid model response: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Should either fail validation or return error from API
        assert response.status_code in [400, 422, 500]
    
    def test_empty_messages(self, client):
        """Test request with empty messages"""
        request_data = {
            "model": "glm-4.5",
            "messages": [],
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        print(f"\nEmpty messages response: {response.status_code}")
        
        # Should fail validation
        assert response.status_code == 422
    
    def test_missing_required_fields(self, client):
        """Test request missing required fields"""
        request_data = {
            "model": "glm-4.5",
            # Missing 'messages' field
        }
        
        response = client.post("/v1/chat/completions", json=request_data)
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "-m", "integration"])

