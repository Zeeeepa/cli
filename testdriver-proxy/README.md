# TestDriver.ai Proxy Server

> **A production-ready proxy server enabling TestDriver.ai to work with any LLM API**

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D16-green)]()

## Quick Start

### 🌍 **Global Installation (Recommended)**
Install once, use anywhere on your system:

```bash
# Clone and install
git clone https://github.com/Zeeeepa/cli.git
cd cli/testdriver-proxy
npm install
npm link  # Registers global commands

# Configure
cp .env.example .env
# Edit .env with your API key
```

Now use **from any directory**:
```bash
testui "click all buttons, login with demo@test.com"
context  # View current page elements
```

### 📦 **Local Installation**
```bash
# Install dependencies
npm install

# Configure API credentials
cp .env.example .env
# Edit .env with your API key

# Start server
npm start
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
testdriver-proxy/
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

## API Endpoints

- `GET /health` - Health check
- `POST /api/:version/testdriver/input` - Natural language → YAML
- `POST /api/:version/testdriver/generate` - Test generation
- `POST /api/:version/testdriver/error` - Error recovery
- `POST /api/:version/testdriver/check` - Task verification
- `POST /api/:version/testdriver/assert` - Assertions

## License

MIT License

## Links

- 📚 [Complete Documentation](./DOCUMENTATION.md)
- 🧪 [Testing Guide](./DOCUMENTATION.md#testing)
- 🚀 [Deployment Guide](./DOCUMENTATION.md#deployment)
- 🐛 [Troubleshooting](./DOCUMENTATION.md#troubleshooting)
