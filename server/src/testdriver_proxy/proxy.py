"""
Main proxy server implementation
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
import json
import time
import uuid
import logging
from typing import AsyncGenerator, Dict, Optional, Any

from .models import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionChunk,
    Choice,
    Message,
    Usage,
    StreamChoice,
    ErrorResponse,
)
from .config import Config

logger = logging.getLogger(__name__)


class ZAIProxy:
    """Proxy handler for Z.ai API"""
    
    def __init__(self, config: Config):
        self.config = config
        self.client = httpx.AsyncClient(timeout=config.timeout)
    
    async def transform_request(self, request: ChatCompletionRequest) -> Dict:
        """Transform OpenAI request to Anthropic Messages API format"""
        # Z.ai uses Anthropic Messages API format
        # Extract system message if present
        system_content = None
        messages = []
        
        for msg in request.messages:
            msg_dict = msg.model_dump()
            if msg.role == "system":
                # Anthropic uses separate system parameter
                system_content = msg.content if isinstance(msg.content, str) else msg.content
            else:
                messages.append(msg_dict)
        
        zai_request = {
            "model": request.model,
            "messages": messages,
            "max_tokens": request.max_tokens or self.config.max_tokens,
            "stream": request.stream,
        }
        
        if system_content:
            zai_request["system"] = system_content
        
        if request.temperature is not None:
            zai_request["temperature"] = request.temperature
        
        if request.top_p is not None:
            zai_request["top_p"] = request.top_p
        
        if request.stop:
            zai_request["stop_sequences"] = request.stop if isinstance(request.stop, list) else [request.stop]
        
        return zai_request
    
    async def chat_completion(
        self, request: ChatCompletionRequest
    ) -> ChatCompletionResponse | AsyncGenerator:
        """Handle chat completion request"""
        
        try:
            zai_request = await self.transform_request(request)
            
            if request.stream:
                return self._stream_response(request, zai_request)
            else:
                return await self._non_stream_response(request, zai_request)
        
        except Exception as e:
            logger.error(f"Error in chat completion: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def _non_stream_response(
        self, request: ChatCompletionRequest, zai_request: Dict
    ) -> ChatCompletionResponse:
        """Handle non-streaming response"""
        
        url = f"{self.config.zai_base_url}/v1/messages"
        headers = {
            "anthropic-version": "2023-06-01",
        }
        if self.config.zai_api_key:
            headers["x-api-key"] = self.config.zai_api_key
        
        response = await self.client.post(
            url,
            json=zai_request,
            headers=headers,
        )
        response.raise_for_status()
        
        zai_response = response.json()
        
        # Transform Anthropic Messages API response to OpenAI format
        # Anthropic response format:
        # {
        #   "id": "msg_xxx",
        #   "type": "message",
        #   "role": "assistant",
        #   "content": [{"type": "text", "text": "..."}],
        #   "stop_reason": "end_turn",
        #   "usage": {"input_tokens": X, "output_tokens": Y}
        # }
        
        # Extract text content from Anthropic format
        content_text = ""
        if "content" in zai_response:
            for content_block in zai_response["content"]:
                if content_block.get("type") == "text":
                    content_text += content_block.get("text", "")
        
        # Map stop_reason to finish_reason
        stop_reason = zai_response.get("stop_reason", "stop")
        finish_reason_map = {
            "end_turn": "stop",
            "max_tokens": "length",
            "stop_sequence": "stop",
        }
        finish_reason = finish_reason_map.get(stop_reason, "stop")
        
        return ChatCompletionResponse(
            id=f"chatcmpl-{zai_response.get('id', uuid.uuid4().hex[:8])}",
            created=int(time.time()),
            model=request.model,
            choices=[
                Choice(
                    index=0,
                    message=Message(
                        role="assistant",
                        content=content_text,
                    ),
                    finish_reason=finish_reason,
                )
            ],
            usage=Usage(
                prompt_tokens=zai_response.get("usage", {}).get("input_tokens", 0),
                completion_tokens=zai_response.get("usage", {}).get("output_tokens", 0),
                total_tokens=(
                    zai_response.get("usage", {}).get("input_tokens", 0) +
                    zai_response.get("usage", {}).get("output_tokens", 0)
                ),
            ),
        )
    
    async def _stream_response(
        self, request: ChatCompletionRequest, zai_request: Dict
    ) -> AsyncGenerator[str, None]:
        """Handle streaming response"""
        
        url = f"{self.config.zai_base_url}/v1/messages"
        headers = {
            "anthropic-version": "2023-06-01",
        }
        if self.config.zai_api_key:
            headers["x-api-key"] = self.config.zai_api_key
        
        chunk_id = f"chatcmpl-{uuid.uuid4().hex[:8]}"
        
        async with self.client.stream(
            "POST",
            url,
            json=zai_request,
            headers=headers,
        ) as response:
            response.raise_for_status()
            
            async for line in response.aiter_lines():
                if not line or line.strip() == "":
                    continue
                
                if line.startswith("data: "):
                    line = line[6:]
                
                if line.strip() == "[DONE]":
                    yield "data: [DONE]\n\n"
                    break
                
                try:
                    # Anthropic streaming format:
                    # event: message_start/content_block_start/content_block_delta/content_block_stop/message_delta/message_stop
                    # data: {...}
                    
                    # Check if this is an event line
                    if line.startswith("event: "):
                        continue
                    
                    zai_chunk = json.loads(line)
                    event_type = zai_chunk.get("type")
                    
                    # Handle different event types
                    delta = {}
                    finish_reason = None
                    
                    if event_type == "content_block_start":
                        # First content block
                        delta = {"role": "assistant", "content": ""}
                    
                    elif event_type == "content_block_delta":
                        # Content delta
                        delta_data = zai_chunk.get("delta", {})
                        if delta_data.get("type") == "text_delta":
                            delta = {"content": delta_data.get("text", "")}
                    
                    elif event_type == "message_delta":
                        # Message completion
                        stop_reason = zai_chunk.get("delta", {}).get("stop_reason")
                        if stop_reason:
                            finish_reason_map = {
                                "end_turn": "stop",
                                "max_tokens": "length",
                                "stop_sequence": "stop",
                            }
                            finish_reason = finish_reason_map.get(stop_reason, "stop")
                    
                    elif event_type == "message_stop":
                        # Stream complete
                        continue
                    
                    # Transform to OpenAI streaming format
                    chunk = ChatCompletionChunk(
                        id=chunk_id,
                        created=int(time.time()),
                        model=request.model,
                        choices=[
                            StreamChoice(
                                index=0,
                                delta=delta,
                                finish_reason=finish_reason,
                            )
                        ],
                    )
                    
                    yield f"data: {chunk.model_dump_json()}\n\n"
                
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse streaming line: {line}")
                    continue


def create_app(config: Optional[Config] = None) -> FastAPI:
    """Create FastAPI application"""
    
    if config is None:
        config = Config.from_env()
    
    config.validate()
    
    app = FastAPI(
        title="TestDriver Proxy",
        description="OpenAI-compatible API proxy for Z.ai GLM models",
        version="0.1.0",
    )
    
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    proxy = ZAIProxy(config)
    
    @app.get("/")
    async def root():
        return {
            "service": "TestDriver Proxy",
            "version": "0.1.0",
            "status": "operational",
        }
    
    @app.get("/v1/models")
    async def list_models():
        """List available models"""
        return {
            "object": "list",
            "data": [
                {
                    "id": "glm-4.5",
                    "object": "model",
                    "created": int(time.time()),
                    "owned_by": "zai",
                },
                {
                    "id": "glm-4.5v",
                    "object": "model",
                    "created": int(time.time()),
                    "owned_by": "zai",
                },
            ],
        }
    
    @app.post("/v1/chat/completions")
    async def chat_completions(request: ChatCompletionRequest):
        """OpenAI-compatible chat completions endpoint"""
        
        if config.log_requests:
            logger.info(f"Chat completion request: model={request.model}, stream={request.stream}")
        
        try:
            result = await proxy.chat_completion(request)
            
            if request.stream:
                return StreamingResponse(
                    result,
                    media_type="text/event-stream",
                )
            else:
                return result
        
        except httpx.HTTPStatusError as e:
            logger.error(f"Z.ai API error: {e.response.status_code} - {e.response.text}")
            error = ErrorResponse.create(
                message=f"Z.ai API error: {e.response.text}",
                type="api_error",
                code=str(e.response.status_code),
            )
            return JSONResponse(
                status_code=e.response.status_code,
                content=error.model_dump(),
            )
        
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            error = ErrorResponse.create(
                message=str(e),
                type="internal_error",
            )
            return JSONResponse(
                status_code=500,
                content=error.model_dump(),
            )
    
    @app.get("/health")
    async def health():
        """Health check endpoint"""
        return {"status": "healthy"}
    
    return app
