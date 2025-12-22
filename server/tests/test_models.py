"""
Tests for data models
"""

import pytest
from pydantic import ValidationError
from testdriver_proxy.models import (
    Message,
    ChatCompletionRequest,
    ChatCompletionResponse,
    Choice,
    Usage,
    ChatCompletionChunk,
    StreamChoice,
    ErrorResponse,
)


class TestMessage:
    """Test Message model"""
    
    def test_valid_message(self):
        """Test creating valid message"""
        msg = Message(role="user", content="Hello")
        assert msg.role == "user"
        assert msg.content == "Hello"
        assert msg.name is None
    
    def test_message_with_name(self):
        """Test message with optional name"""
        msg = Message(role="assistant", content="Hi there", name="bot")
        assert msg.name == "bot"
    
    def test_invalid_role(self):
        """Test message with invalid role"""
        with pytest.raises(ValidationError):
            Message(role="invalid", content="test")
    
    def test_multimodal_content(self):
        """Test message with multimodal content"""
        content = [
            {"type": "text", "text": "What's in this image?"},
            {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}},
        ]
        msg = Message(role="user", content=content)
        assert isinstance(msg.content, list)
        assert len(msg.content) == 2


class TestChatCompletionRequest:
    """Test ChatCompletionRequest model"""
    
    def test_minimal_request(self):
        """Test minimal valid request"""
        req = ChatCompletionRequest(
            model="glm-4.5",
            messages=[Message(role="user", content="Hello")],
        )
        assert req.model == "glm-4.5"
        assert len(req.messages) == 1
        assert req.temperature == 0.7
        assert req.stream is False
    
    def test_full_request(self):
        """Test request with all parameters"""
        req = ChatCompletionRequest(
            model="glm-4.5",
            messages=[Message(role="user", content="Hello")],
            temperature=0.5,
            top_p=0.9,
            n=2,
            stream=True,
            stop=["END"],
            max_tokens=1000,
            presence_penalty=0.5,
            frequency_penalty=0.5,
            user="user123",
        )
        assert req.temperature == 0.5
        assert req.top_p == 0.9
        assert req.n == 2
        assert req.stream is True
        assert req.stop == ["END"]
        assert req.max_tokens == 1000
        assert req.user == "user123"
    
    def test_stop_as_string(self):
        """Test stop parameter as string"""
        req = ChatCompletionRequest(
            model="glm-4.5",
            messages=[Message(role="user", content="Hello")],
            stop="END",
        )
        assert req.stop == "END"
    
    def test_multiple_messages(self):
        """Test request with multiple messages"""
        messages = [
            Message(role="system", content="You are helpful"),
            Message(role="user", content="Hello"),
            Message(role="assistant", content="Hi! How can I help?"),
            Message(role="user", content="Tell me a joke"),
        ]
        req = ChatCompletionRequest(model="glm-4.5", messages=messages)
        assert len(req.messages) == 4


class TestChatCompletionResponse:
    """Test ChatCompletionResponse model"""
    
    def test_valid_response(self):
        """Test creating valid response"""
        resp = ChatCompletionResponse(
            id="chatcmpl-123",
            created=1234567890,
            model="glm-4.5",
            choices=[
                Choice(
                    index=0,
                    message=Message(role="assistant", content="Hello!"),
                    finish_reason="stop",
                )
            ],
            usage=Usage(prompt_tokens=10, completion_tokens=5, total_tokens=15),
        )
        
        assert resp.id == "chatcmpl-123"
        assert resp.object == "chat.completion"
        assert resp.model == "glm-4.5"
        assert len(resp.choices) == 1
        assert resp.usage.total_tokens == 15
    
    def test_multiple_choices(self):
        """Test response with multiple choices"""
        resp = ChatCompletionResponse(
            id="chatcmpl-123",
            created=1234567890,
            model="glm-4.5",
            choices=[
                Choice(
                    index=0,
                    message=Message(role="assistant", content="Option 1"),
                    finish_reason="stop",
                ),
                Choice(
                    index=1,
                    message=Message(role="assistant", content="Option 2"),
                    finish_reason="stop",
                ),
            ],
            usage=Usage(prompt_tokens=10, completion_tokens=10, total_tokens=20),
        )
        
        assert len(resp.choices) == 2
        assert resp.choices[0].index == 0
        assert resp.choices[1].index == 1


class TestChatCompletionChunk:
    """Test streaming chunk model"""
    
    def test_valid_chunk(self):
        """Test creating valid streaming chunk"""
        chunk = ChatCompletionChunk(
            id="chatcmpl-123",
            created=1234567890,
            model="glm-4.5",
            choices=[
                StreamChoice(
                    index=0,
                    delta={"content": "Hello"},
                    finish_reason=None,
                )
            ],
        )
        
        assert chunk.object == "chat.completion.chunk"
        assert chunk.choices[0].delta["content"] == "Hello"
    
    def test_final_chunk(self):
        """Test final streaming chunk"""
        chunk = ChatCompletionChunk(
            id="chatcmpl-123",
            created=1234567890,
            model="glm-4.5",
            choices=[
                StreamChoice(
                    index=0,
                    delta={},
                    finish_reason="stop",
                )
            ],
        )
        
        assert chunk.choices[0].finish_reason == "stop"
        assert chunk.choices[0].delta == {}


class TestErrorResponse:
    """Test error response model"""
    
    def test_create_error(self):
        """Test creating error response"""
        error = ErrorResponse.create(
            message="Invalid request",
            type="invalid_request_error",
            code="400",
        )
        
        assert error.error["message"] == "Invalid request"
        assert error.error["type"] == "invalid_request_error"
        assert error.error["code"] == "400"
    
    def test_create_error_minimal(self):
        """Test creating error with minimal parameters"""
        error = ErrorResponse.create(message="Something went wrong")
        
        assert error.error["message"] == "Something went wrong"
        assert error.error["type"] == "invalid_request_error"
        assert "code" not in error.error


class TestUsage:
    """Test Usage model"""
    
    def test_valid_usage(self):
        """Test creating valid usage statistics"""
        usage = Usage(prompt_tokens=100, completion_tokens=50, total_tokens=150)
        assert usage.prompt_tokens == 100
        assert usage.completion_tokens == 50
        assert usage.total_tokens == 150
    
    def test_zero_usage(self):
        """Test usage with zero tokens"""
        usage = Usage(prompt_tokens=0, completion_tokens=0, total_tokens=0)
        assert usage.total_tokens == 0

