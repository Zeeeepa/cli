# TestDriver Proxy Server - Endpoint Testing Guide

## Overview

This guide covers testing and validation of all proxy server endpoints. The proxy server provides a bridge between the TestDriver CLI and various LLM API providers (OpenAI, Anthropic, Z.ai, etc.).

## Available Endpoints

### Health & Monitoring Endpoints

#### `GET /health`
Basic health check endpoint providing server status and configuration.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-07T23:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": {
    "node": "v18.x.x",
    "platform": "linux",
    "memory": {
      "used": 150,
      "total": 512,
      "unit": "MB"
    }
  },
  "config": {
    "provider": "openai",
    "model": "gpt-4",
    "port": 8080
  }
}
```

#### `GET /health/full`
Comprehensive health check including API endpoint validation.

**Response:**
```json
{
  "status": "healthy",
  "dependencies": {
    "apiEndpoint": {
      "status": "healthy",
      "responseTime": "150ms"
    }
  }
}
```

#### `GET /metrics`
Prometheus metrics endpoint for monitoring.

**Response:** Plain text Prometheus format
```
# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1",method="POST",route="/api/:version/testdriver/input",status="200"} 5
...
```

### API Endpoints

#### `POST /api/:version/testdriver/input`
Main endpoint for converting natural language to YAML test commands.

**Parameters:**
- `input` (required): Natural language test instruction
- `image` (optional): Screenshot file (multipart/form-data)
- `mousePosition` (optional): JSON string `{"x": 100, "y": 100}`
- `activeWindow` (optional): Active window title
- `stream` (optional): Boolean for streaming response

**Example Request:**
```bash
curl -X POST http://localhost:8080/api/v6/testdriver/input \
  -F "input=Click the login button" \
  -F "mousePosition={\"x\":100,\"y\":100}" \
  -F "activeWindow=Chrome Browser"
```

**Response:**
```yaml
- command: hover-text
  text: "Login"
  action: click
```

#### `POST /api/:version/testdriver/error`
Endpoint for error reporting and diagnostics.

**Parameters:**
- `error` (required): JSON string with error details
- `context` (optional): Additional context information

#### `POST /api/:version/testdriver/check`
Validates task completion or state verification.

**Parameters:**
- `task` (required): Task description to verify
- `screenshot` (optional): Screenshot for verification
- `mousePosition` (optional): Current mouse position

#### `POST /api/:version/testdriver/generate`
Generates test commands from a prompt.

**Parameters:**
- `prompt` (required): Test generation prompt
- `screenshot` (optional): Screenshot for context

#### `POST /api/:version/testdriver/assert`
Performs assertion verification.

**Parameters:**
- `assertion` (required): Assertion to verify
- `screenshot` (optional): Screenshot for verification

#### `POST /api/:version/testdriver/hover/text`
Finds text coordinates for hovering/clicking.

**Parameters:**
- `text` (required): Text to find
- `description` (optional): Additional context
- `screenshot` (optional): Screenshot to search

#### `POST /api/:version/testdriver/hover/image`
Finds image template coordinates.

**Parameters:**
- `template` (required): Template image file
- `screenshot` (required): Screenshot to search
- `threshold` (optional): Matching threshold (0-1)

## Running Tests

### Quick Test
```bash
# Start the server (if not running)
npm start

# In another terminal, run tests
node test-endpoints.js
```

### With Custom Server URL
```bash
PROXY_URL=http://localhost:8080 node test-endpoints.js
```

### Test Output
```
🚀 Starting TestDriver Proxy Endpoint Tests
============================================================
Testing server at: http://localhost:8080

📊 Testing Health Endpoint
✓ GET /health returns 200
✓ Health response has status field
✓ Health response has timestamp
✓ Health response has uptime

📈 Testing Metrics Endpoint
✓ GET /metrics returns 200
✓ Metrics has correct content-type
✓ Metrics contains prometheus data

...

============================================================
📊 Test Summary
============================================================
✓ Passed: 28
✗ Failed: 0
⏱  Duration: 450ms
📈 Success Rate: 100.0%

🎉 All tests passed!
```

## Endpoint Enhancements

### New Features

1. **Input Validation**
   - All endpoints now validate request parameters
   - Clear error messages for invalid inputs
   - Maximum length limits to prevent abuse

2. **Error Handling**
   - Standardized error responses
   - Request IDs for tracing
   - Detailed error context in development mode

3. **Timeout Management**
   - Configurable request timeouts
   - Automatic timeout responses
   - Prevents hanging requests

4. **Retry Logic**
   - Automatic retry for transient failures
   - Exponential backoff strategy
   - Configurable retry attempts

5. **Security**
   - Input sanitization
   - Request size limits
   - XSS protection

6. **Monitoring**
   - Prometheus metrics integration
   - Request duration tracking
   - Success/failure rate monitoring

### Using Enhancement Utilities

```javascript
const {
  validateInputEndpoint,
  handleValidationErrors,
  asyncHandler,
  errorHandler,
  timeoutMiddleware,
  retryWithBackoff
} = require('./endpoint-enhancements');

// Apply validation middleware
app.post('/api/:version/testdriver/input',
  validateInputEndpoint,
  handleValidationErrors,
  timeoutMiddleware(30000),
  asyncHandler(async (req, res) => {
    // Your endpoint logic here
    const result = await retryWithBackoff(
      () => callLLMAPI(req.body),
      { maxRetries: 3 }
    );
    res.json(result);
  })
);

// Apply global error handler
app.use(errorHandler);
```

## Monitoring with Prometheus

### Setting up Prometheus

1. **Configure Prometheus** (`prometheus.yml`):
```yaml
scrape_configs:
  - job_name: 'testdriver-proxy'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
```

2. **Key Metrics to Monitor:**

- `http_request_duration_seconds` - Request latency
- `http_request_total` - Total requests by endpoint
- `llm_api_calls_total` - LLM API call count
- `llm_api_duration_seconds` - LLM API response time

3. **Example Queries:**

```promql
# Average response time by endpoint
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Error rate
rate(http_request_total{status=~"5.."}[5m])

# Request throughput
rate(http_request_total[5m])
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure server is running: `npm start`
   - Check port configuration in `.env`

2. **Authentication Errors**
   - Verify API keys in `.env`
   - Check `OPENAI_API_KEY` or relevant provider key

3. **Timeout Errors**
   - Increase timeout in configuration
   - Check network connectivity
   - Verify LLM API service status

4. **Validation Errors**
   - Review error details in response
   - Check parameter formats (JSON strings, etc.)
   - Ensure required fields are present

### Debug Mode

Enable detailed logging:
```bash
DEBUG=* node testdriver-proxy/server.js
```

Or set in `.env`:
```
LOG_LEVEL=debug
```

## Performance Optimization

### Recommended Settings

```env
# Connection pooling
HTTP_KEEPALIVE=true
HTTP_KEEPALIVE_TIMEOUT=60000

# Request timeout
REQUEST_TIMEOUT=30000

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Caching
ENABLE_RESPONSE_CACHE=true
CACHE_TTL=300
```

### Load Testing

Use tools like `autocannon` or `wrk`:

```bash
# Install autocannon
npm install -g autocannon

# Run load test
autocannon -c 10 -d 30 http://localhost:8080/health
```

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong API keys
   - Rotate keys regularly

2. **Input Validation**
   - Always validate user input
   - Set maximum lengths
   - Sanitize HTML/scripts

3. **Rate Limiting**
   - Configure per-IP limits
   - Monitor for abuse
   - Use API keys for tracking

4. **HTTPS in Production**
   - Use reverse proxy (nginx, Caddy)
   - Enable TLS/SSL
   - Configure security headers

## Next Steps

1. ✅ **Run endpoint tests** to verify functionality
2. ✅ **Set up Prometheus** for monitoring
3. ✅ **Configure rate limiting** for production
4. ✅ **Enable HTTPS** with reverse proxy
5. ✅ **Set up alerts** for errors and performance issues
6. ✅ **Monitor logs** for suspicious activity

## Support

- GitHub Issues: https://github.com/testdriverai/cli/issues
- Documentation: https://docs.testdriver.ai
- Community: https://discord.gg/testdriver

---

**Last Updated:** 2025-12-07
**Version:** 1.0.0

