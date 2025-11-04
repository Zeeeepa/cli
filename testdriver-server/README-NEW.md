# TestDriver.ai Proxy Server - Complete Implementation

A production-ready proxy server that brings the full power of **TestDriver.ai** to any LLM provider (Z.ai, OpenAI, Anthropic, or custom APIs). This implementation supports all 28 TestDriver commands, intelligent test generation, exploratory testing, self-healing capabilities, and more.

## 🚀 Features

### Core Capabilities
- ✅ **All 28 TestDriver Commands** - Complete support for every command in TestDriver 6.0.0
- ✅ **Multi-LLM Support** - Works with Anthropic, OpenAI, Z.ai, or any OpenAI-compatible API
- ✅ **Natural Language Test Generation** - Convert plain English to executable YAML tests
- ✅ **Interactive Exploratory Mode** - Build tests step-by-step with AI assistance
- ✅ **Vision-Based Testing** - Generate tests from screenshots
- ✅ **YAML Validation** - Comprehensive validation with helpful error messages
- ✅ **Session Management** - Save and restore test sessions
- ✅ **Self-Healing Infrastructure** - Built-in support for intelligent test recovery

### Production Features
- 🔒 **Rate Limiting** - Built-in protection against API abuse
- 📊 **Structured Logging** - Winston-based logging for debugging and monitoring
- 🛡️ **Error Handling** - Comprehensive error handling at all layers
- 🔄 **Retry Logic** - Automatic retry with exponential backoff
- ❤️ **Health Checks** - System status monitoring endpoints
- 🎯 **Request Tracking** - Request ID tracking for debugging
- ⚡ **Graceful Shutdown** - Clean process termination

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)

## 🔧 Installation

### Prerequisites

- Node.js 16+ and npm 8+
- API key for your chosen LLM provider (Z.ai, OpenAI, or Anthropic)

### Setup

```bash
# Clone repository
git clone https://github.com/Zeeeepa/cli.git
cd cli/testdriver-proxy

# Install dependencies
npm install

# Create .env file (or copy from .env.example)
cp .env .env.local
# Edit .env.local with your API credentials

# Start server
npm start

# For development with auto-reload
npm run dev
```

## ⚙️ Configuration

Configure the server using environment variables in `.env`:

### LLM Provider Configuration

**Z.ai (Default):**
```env
API_PROVIDER=anthropic
API_KEY=your_zai_api_key
API_BASE_URL=https://api.z.ai/api/anthropic
MODEL=glm-4.6
```

**Anthropic:**
```env
API_PROVIDER=anthropic
ANTHROPIC_AUTH_TOKEN=your_anthropic_key
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

**OpenAI:**
```env
API_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4-turbo
```

**Custom OpenAI-Compatible API:**
```env
API_PROVIDER=custom
API_KEY=your_api_key
API_BASE_URL=https://your-api.com/v1
MODEL=your-model-name
```

### Server Configuration

```env
PORT=3000
NODE_ENV=development
DEBUG=true

# Security
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100        # Max requests per window
MAX_FILE_SIZE=10485760    # 10MB

# Storage
TEST_DIR=./tests/generated
SESSION_DIR=./sessions
LOG_DIR=./logs

# Features
ENABLE_SELF_HEALING=true
ENABLE_TEST_GENERATION=true
```

## 🌐 API Endpoints

### Health Check

**GET /health** - Basic health check
```bash
curl http://localhost:3000/health
```

**GET /health/detailed** - Detailed health with LLM connectivity test
```bash
curl http://localhost:3000/health/detailed
```

### Test Generation

**POST /api/v1/generate** - Generate complete test from natural language
```bash
curl -X POST http://localhost:3000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test login functionality. Navigate to login page, enter credentials, click login, verify success",
    "platform": "web"
  }'
```

**POST /api/v1/generate/command** - Generate single command
```bash
curl -X POST http://localhost:3000/api/v1/generate/command \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Click the login button"
  }'
```

### Exploratory Testing

**POST /api/v1/explore** - Execute a single test step
```bash
curl -X POST http://localhost:3000/api/v1/explore \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Navigate to the login page"
  }'
```

**GET /api/v1/explore/:sessionId** - Get session details
```bash
curl http://localhost:3000/api/v1/explore/session-id-here
```

**DELETE /api/v1/explore/:sessionId** - Delete session
```bash
curl -X DELETE http://localhost:3000/api/v1/explore/session-id-here
```

### Save Tests

**POST /api/v1/save** - Save test session to YAML file
```bash
curl -X POST http://localhost:3000/api/v1/save \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-id-here",
    "filename": "my-test.yaml"
  }'
```

**GET /api/v1/save/list** - List all saved test files
```bash
curl http://localhost:3000/api/v1/save/list
```

**GET /api/v1/save/:filename** - Get saved test file content
```bash
curl http://localhost:3000/api/v1/save/my-test.yaml
```

### Validation

**POST /api/v1/validate** - Validate YAML test file
```bash
curl -X POST http://localhost:3000/api/v1/validate \
  -H "Content-Type: application/json" \
  -d '{
    "yaml": "version: 6.0.0\nsteps:\n  - command: hover-text\n    text: Login"
  }'
```

**POST /api/v1/validate/command** - Validate single command
```bash
curl -X POST http://localhost:3000/api/v1/validate/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": {
      "command": "hover-text",
      "text": "Login"
    }
  }'
```

## 📝 Usage Examples

### Example 1: Generate Complete Login Test

```bash
curl -X POST http://localhost:3000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test user login workflow. Start application, navigate to login, enter username testuser@example.com and password testpass123, click login button, verify dashboard appears",
    "platform": "web"
  }' | jq '.yaml'
```

**Expected Output:**
```yaml
version: 6.0.0
steps:
  - prompt: "Start the application"
    commands:
      - command: focus-application
        name: "Chrome"
  
  - prompt: "Navigate to login page"
    commands:
      - command: hover-text
        text: "Login"
      - command: press-keys
        keys: "{Return}"
  
  - prompt: "Enter username"
    commands:
      - command: hover-text
        text: "Email"
      - command: type
        text: "testuser@example.com"
  
  - prompt: "Enter password"
    commands:
      - command: hover-text
        text: "Password"
      - command: type
        text: "testpass123"
  
  - prompt: "Click login button"
    commands:
      - command: hover-text
        text: "Sign In"
  
  - prompt: "Verify dashboard appears"
    commands:
      - command: assert
        value: "Dashboard"
        condition: "visible"
```

### Example 2: Interactive Exploratory Testing

```bash
# Start exploration
SESS_ID=$(curl -s -X POST http://localhost:3000/api/v1/explore \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Focus on Chrome browser"}' \
  | jq -r '.sessionId')

# Add more steps
curl -X POST http://localhost:3000/api/v1/explore \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"Navigate to login page\", \"session\": \"$SESS_ID\"}"

curl -X POST http://localhost:3000/api/v1/explore \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"Enter credentials\", \"session\": \"$SESS_ID\"}"

# Save session as YAML
curl -X POST http://localhost:3000/api/v1/save \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESS_ID\", \"filename\": \"login-test.yaml\"}"
```

### Example 3: Vision-Based Test Generation

```bash
# Generate test from screenshot
curl -X POST http://localhost:3000/api/v1/generate/command \
  -F "instruction=Click the blue submit button" \
  -F "screenshot=@./screenshot.png"
```

### Example 4: Validate Existing Test

```bash
# Validate YAML file
curl -X POST http://localhost:3000/api/v1/validate \
  -H "Content-Type: application/json" \
  --data-binary @my-test.yaml \
  | jq '.valid, .errors, .warnings'
```

## 🏗️ Architecture

### Directory Structure

```
testdriver-proxy/
├── src/
│   ├── config/              # Environment & configuration
│   │   └── index.js
│   ├── models/              # Data schemas & command definitions
│   │   └── commands.js      # All 28 TestDriver commands
│   ├── services/            # Business logic
│   │   ├── llm-provider.js  # Multi-LLM abstraction
│   │   └── yaml-generator.js # Test generation logic
│   ├── routes/              # API endpoints
│   │   ├── generate.js      # Test generation
│   │   ├── explore.js       # Interactive exploration
│   │   ├── save.js          # Session persistence
│   │   ├── validate.js      # YAML validation
│   │   └── health.js        # Health checks
│   ├── middleware/          # Express middleware
│   │   ├── error-handler.js # Error handling
│   │   └── validation.js    # Request validation
│   └── utils/               # Utilities
│       ├── logger.js        # Winston logging
│       └── image-processor.js # Screenshot handling
├── logs/                    # Application logs
├── tests/generated/         # Generated test files
├── sessions/                # Session storage
├── server-new.js            # Main entry point
├── .env                     # Configuration
└── package.json
```

### Key Components

**1. Configuration Module (`src/config/index.js`)**
- Centralized environment variable management
- Multi-provider LLM support
- Configuration validation on startup

**2. Command Models (`src/models/commands.js`)**
- Complete definition of all 28 TestDriver commands
- Parameter validation
- YAML example generation

**3. LLM Provider Service (`src/services/llm-provider.js`)**
- Multi-provider abstraction (Anthropic, OpenAI, Z.ai, custom)
- Automatic retry with exponential backoff
- Vision support for screenshot-based generation

**4. YAML Generator Service (`src/services/yaml-generator.js`)**
- Natural language to YAML conversion
- Context-aware command generation
- Exploratory test creation

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Live API tests
npm run test:live

# Validation tests
npm run validate
```

### Manual Testing

```bash
# Start server
npm start

# Test health endpoint
curl http://localhost:3000/health

# Test generation
curl -X POST http://localhost:3000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"description": "Test login", "platform": "web"}'
```

## 🚀 Deployment

### Docker

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run

# Using docker-compose
npm run docker:compose:up
```

### Production Deployment

1. **Set environment variables:**
```env
NODE_ENV=production
DEBUG=false
PORT=8080
```

2. **Use process manager (PM2):**
```bash
npm install -g pm2
pm2 start server-new.js --name testdriver-proxy
pm2 save
pm2 startup
```

3. **Configure reverse proxy (nginx):**
```nginx
location /api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## 📚 Supported Commands

All 28 TestDriver commands are fully supported:

### Text/Image Interaction
- `hover-text` - Find and interact with text elements
- `hover-image` - Find and interact with images
- `match-image` - Verify screenshot matches template

### Waiting
- `wait` - Delay execution
- `wait-for-text` - Wait for text to appear
- `wait-for-image` - Wait for image to appear

### Input
- `type` - Type text at cursor
- `press-keys` - Press keyboard keys

### Scrolling
- `scroll` - Scroll in direction
- `scroll-until-text` - Scroll until text visible
- `scroll-until-image` - Scroll until image visible

### Assertion/Execution
- `assert` - Verify expected state
- `exec` - Execute system commands
- `run` - Execute YAML test file

### Application/State
- `focus-application` - Bring window to focus
- `remember` - Store value in memory
- `if` - Conditional execution

And 12 more commands! See `src/models/commands.js` for complete list.

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Change port in .env
PORT=3001
```

**LLM API errors:**
```bash
# Check detailed health
curl http://localhost:3000/health/detailed

# Verify credentials in .env
# Check API_KEY, API_BASE_URL, MODEL
```

**YAML validation failures:**
```bash
# Validate individual commands first
curl -X POST http://localhost:3000/api/v1/validate/command \
  -H "Content-Type: application/json" \
  -d '{"command": {...}}'
```

## 📖 Documentation

- [TestDriver.ai Docs](https://docs.testdriver.ai) - Official documentation
- [API Reference](./API.md) - Detailed API documentation
- [Examples](./examples/) - More usage examples

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Credits

Built with:
- [TestDriver.ai](https://testdriver.ai) - The amazing UI testing framework
- [Express](https://expressjs.com/) - Web framework
- [Winston](https://github.com/winstonjs/winston) - Logging
- [Sharp](https://sharp.pixelplumbing.com/) - Image processing
- [js-yaml](https://github.com/nodeca/js-yaml) - YAML parsing

---

**Ready to test?** Start the server and try generating your first test! 🚀

