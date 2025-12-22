"""
Data models for OpenAI-compatible API
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class Message(BaseModel):
    """Chat message"""
    role: Literal["system", "user", "assistant"]
    content: str | List[Dict[str, Any]]
    name: Optional[str] = None


class ChatCompletionRequest(BaseModel):
    """OpenAI chat completion request format"""
    model: str
    messages: List[Message]
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 1.0
    n: Optional[int] = 1
    stream: Optional[bool] = False
    stop: Optional[List[str] | str] = None
    max_tokens: Optional[int] = None
    presence_penalty: Optional[float] = 0
    frequency_penalty: Optional[float] = 0
    logit_bias: Optional[Dict[str, float]] = None
    user: Optional[str] = None


class Choice(BaseModel):
    """Completion choice"""
    index: int
    message: Message
    finish_reason: Optional[str] = None


class Usage(BaseModel):
    """Token usage statistics"""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatCompletionResponse(BaseModel):
    """OpenAI chat completion response format"""
    id: str
    object: Literal["chat.completion"] = "chat.completion"
    created: int
    model: str
    choices: List[Choice]
    usage: Usage
    system_fingerprint: Optional[str] = None


class StreamChoice(BaseModel):
    """Streaming choice"""
    index: int
    delta: Dict[str, Any]
    finish_reason: Optional[str] = None


class ChatCompletionChunk(BaseModel):
    """Streaming response chunk"""
    id: str
    object: Literal["chat.completion.chunk"] = "chat.completion.chunk"
    created: int
    model: str
    choices: List[StreamChoice]
    system_fingerprint: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response"""
    error: Dict[str, Any]
    
    @classmethod
    def create(cls, message: str, type: str = "invalid_request_error", code: Optional[str] = None) -> "ErrorResponse":
        """Create error response"""
        error_dict = {
            "message": message,
            "type": type,
        }
        if code:
            error_dict["code"] = code
        return cls(error=error_dict)

