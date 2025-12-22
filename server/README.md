# TestDriver.ai Proxy Server

> **A production-ready proxy server enabling TestDriver.ai to work with any LLM API**

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D16-green)]()

## ✨ What's New

### Production-Ready Enhancements

**🛡️ Robustness & Reliability:**
- ✅ Automatic retry with exponential backoff for transient errors
- ✅ Enhanced error handling with clear, actionable messages
- ✅ Graceful shutdown handling (SIGTERM/SIGINT)
- ✅ Port conflict detection with helpful resolution steps
- ✅ Request ID tracking for debugging
- ✅ Comprehensive timeout handling

**🔒 Security & Performance:**
- ✅ Rate limiting (100 requests/15min per IP, configurable)
- ✅ Request validation middleware
- ✅ Memory usage monitoring
- ✅ Structured logging with Winston
- ✅ Health check endpoints (basic + full API connectivity test)

**🧪 Testing & Validation:**
- ✅ Comprehensive test suite for Anthropic/Z.ai integration
- ✅ Automated testui command validation
- ✅ Quick validation script (`./quick-test.sh`)
- ✅ Performance benchmarking tools

**📚 Documentation:**
- ✅ Detailed troubleshooting guide (TROUBLESHOOTING.md)
- ✅ Configuration examples for all providers
- ✅ Common issues and solutions
- ✅ Advanced debugging techniques

## 🚀 Quick Start

### Step 1: Clone & Install
```bash
git clone https://github.com/Zeeeepa/cli.git
cd cli/server
npm install
```

### Step 2: Get Z.ai API Key (Free)
1. Visit [https://z.ai](https://z.ai) and sign up
2. Get your API key from the dashboard
3. Copy it for the next step

### Step 3: Configure Environment
```bash
# Set your Z.ai API key as ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY="your-zai-api-key-here"

# Optional: Add to your shell profile for persistence
echo 'export ANTHROPIC_API_KEY="your-zai-api-key-here"' >> ~/.bashrc  # or ~/.zshrc
source ~/.bashrc  # or ~/.zshrc
```

### Step 4: Test It!
```bash
# Run a natural language test
testui PROMPT="login with demo@testdriver.ai"

# Or run a test file
testui TEST="tests/example.yaml"

# Test against your own app
testui APP="http://your-app:8080" PROMPT="click the signup button"
```

## 📖 Usage Examples

### Basic Testing (Auto-starts test app on port 4000)
```bash
testui PROMPT="click all buttons and verify"
testui PROMPT="login with test@example.com"
testui PROMPT="fill out the contact form"
```

### Test File Execution
```bash
testui TEST="path/to/test.yaml"
testui TEST="tests/login-flow.yaml"
```

### Testing External Apps
```bash
testui APP="http://localhost:3000" PROMPT="test the checkout flow"
testui APP="https://myapp.com" PROMPT="verify the homepage loads"
```

### Positional Arguments (Shorthand)
```bash
testui "click the signup button"  # Same as PROMPT="..."
```

## 🌍 Global Commands

After `npm link`, use these commands from **anywhere**:

### **`testui` - Natural Language Testing**
```bash
# Execute tests with natural language
testui "click all buttons"
testui "login with demo@test.com and password TestPass123"
testui "add 3 tasks and verify they appear"
testui "fill registration form and submit"
```

### **`context` - UI Context Retrieval**
```bash
# Get current page context
context

# Get context from specific URL
context http://localhost:4000

# Shows:
# - Page title and URL
# - All visible buttons
# - All input fields
# - Interactive elements
```

---

## 🚀 One-Command Deployment & Testing

### **🎯 End-to-End Execution (Natural Language)** ⭐ NEW!
```bash
npm run execute "Login with demo@testdriver.ai, add 3 tasks, verify they appear"
```

**The complete integrated system:**
- ✅ Starts all services automatically
- ✅ Parses natural language into steps
- ✅ Executes in real browser (Selenium)
- ✅ Captures screenshots at each step
- ✅ Retrieves UI context automatically
- ✅ Generates detailed HTML report
- ✅ Handles cleanup

**Example commands:**
```bash
npm run execute "Click login button, type email, submit form"
npm run execute "Navigate to dashboard, add task, verify it appears"
npm run execute "Fill out registration form and submit"
```

Report saved to: `execution-reports/execution_TIMESTAMP.html`

---

### **Interactive Validation (Manual Testing)**
```bash
npm run validate
```

Launches interactive dashboard at **http://localhost:5000** with:
- ✅ Real-time service monitoring
- ✅ One-click endpoint testing
- ✅ Component validation checklist
- ✅ Visual test results

### **Automated Testing (AI-Powered)**
```bash
npm run deploy
```

Runs complete automated test suite:
- ✅ Deploys all services automatically
- ✅ Auto-discovers UI features
- ✅ Tests all endpoints with AI
- ✅ Generates professional HTML report
- ✅ Validates all components

Report saved to: `test-reports/test_report_TIMESTAMP.html`

## Features

- ✅ Multi-provider AI support (Z.ai, OpenAI, Anthropic)
- ✅ Vision-based UI testing with screenshot analysis
- ✅ Natural language → YAML test command conversion
- ✅ AI-powered error recovery & debugging
- ✅ Automatic test scenario generation

## Documentation

📚 **[View Complete Documentation](./DOCUMENTATION.md)** 📚

The comprehensive documentation includes:
- Full API reference
- Configuration guide
- Testing instructions
- Deployment options
- Codebase analysis
- Troubleshooting guide

## Test Organization

All tests are organized in the `tests/` directory:

```
tests/
├── test_config.py           # Unit tests: Configuration
├── test_models.py           # Unit tests: Data models
├── test_proxy.py            # Unit tests: Proxy logic
├── integration/             # Integration tests
├── scripts/                 # Test runner scripts
└── ui/                      # UI tests and test application
```

## Quick Test

```bash
# Run basic tests
npm test

# Run live integration tests
cd tests/scripts
./run_live_tests.sh
```

## Project Structure

```
server/
├── server.js              # Main Express.js server (830 lines)
├── DOCUMENTATION.md       # Complete documentation (800+ lines)
├── package.json           # Dependencies
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose
└── tests/                 # All tests organized by type
    ├── *.py              # Unit tests
    ├── integration/      # Integration tests
    ├── scripts/          # Test runners
    └── ui/               # UI tests
```

## 🧪 Testing & Validation

### Quick Validation
Run a quick syntax and functionality check:
```bash
./quick-test.sh
```

### Comprehensive Test Suite
```bash
# Start the server first
npm start &

# Run all integration tests
node tests/test-anthropic-zai.js

# Run testui command tests
bash tests/test-testui-command.sh

# Test against custom server
TEST_SERVER=http://my-server.com:3000 bash tests/test-testui-command.sh
```

### Health Checks
```bash
# Basic health check (fast)
curl http://localhost:3000/health

# Full health check (includes API connectivity test)
curl http://localhost:3000/health/full
```

### Test Coverage
- ✅ Server startup and configuration
- ✅ API endpoint availability
- ✅ Error handling and retry logic
- ✅ Rate limiting functionality
- ✅ Request/response format validation
- ✅ Memory usage monitoring
- ✅ Concurrent request handling
- ✅ Timeout configuration
- ✅ Health check endpoints

## API Endpoints

### Health & Status
- `GET /health` - Quick health check (no API call)
- `GET /health/full` - Deep health check with API connectivity test
- `GET /` - API information and available endpoints

### TestDriver Integration
- `POST /api/:version/testdriver/input` - Natural language → YAML
- `POST /api/:version/testdriver/generate` - Test generation
- `POST /api/:version/testdriver/error` - Error recovery
- `POST /api/:version/testdriver/check` - Task verification
- `POST /api/:version/testdriver/assert` - Assertions
- `POST /api/:version/testdriver/hover/text` - Text coordinate finding
- `POST /api/:version/testdriver/hover/image` - Image template matching

## License

MIT License

## 🔧 Troubleshooting

Having issues? Check out our comprehensive troubleshooting guide:

**[📖 TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

Common issues covered:
- Port conflicts and resolution
- API authentication failures
- Connection timeouts
- Rate limiting
- Permission errors
- Performance optimization
- Debug logging

## Links

- 📚 [Complete Documentation](./DOCUMENTATION.md)
- 🔧 [Troubleshooting Guide](./TROUBLESHOOTING.md)
- 🧪 [Testing Guide](./DOCUMENTATION.md#testing)
- 🚀 [Deployment Guide](./DOCUMENTATION.md#deployment)
