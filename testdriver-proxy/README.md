# TestUI - AI-Powered Test Automation

> **Natural language test automation powered by AI vision models**  
> Write tests in plain English • Run anywhere • Works with any LLM

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TestDriver](https://img.shields.io/badge/TestDriver-Compatible-orange.svg)](https://testdriver.ai)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [Windows Support](#windows-support)
- [AI Agent Integration](#ai-agent-integration)
- [Examples](#examples)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Testing](#testing)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Overview

### What is TestUI?

TestUI is a natural language interface for browser automation and UI testing. Simply describe what you want to test, and TestUI generates and executes the test automatically using AI vision models.

### Key Features

- ✅ **Natural Language** - Write tests in plain English
- ✅ **AI Vision** - GLM-4.5V model for UI understanding  
- ✅ **Cross-Platform** - Works on Windows, macOS, Linux
- ✅ **Multi-LLM Support** - Anthropic, OpenAI, Z.ai, custom APIs
- ✅ **Auto-Cleanup** - Temp files cleaned automatically
- ✅ **URL Aware** - Include URLs directly in prompts
- ✅ **Production Ready** - Docker, CI/CD, monitoring

### Technology Stack

- **Runtime:** Node.js 16+
- **Framework:** Express.js  
- **AI Models:** Anthropic Claude, GLM-4.5V, OpenAI GPT-4
- **Testing:** TestDriver.ai, Jest, Playwright
- **Logging:** Winston
- **Containerization:** Docker & Docker Compose

---

## ⚡ Quick Start

### Prerequisites

- Node.js 16 or higher
- npm (comes with Node.js)
- API key from Anthropic, OpenAI, or Z.ai

### 30-Second Setup

```bash
# Clone the repository
git clone https://github.com/Zeeeepa/cli.git
cd cli/testdriver-proxy

# Install dependencies
npm install

# Set your API key
export ANTHROPIC_API_KEY="your-key-here"

# Run your first test!
npm run testui "visit example.com and get the page title"
```

That's it! 🎉

---

## 📦 Installation

### Method 1: NPM Scripts (Recommended)

```bash
cd testdriver-proxy
npm install

# Use npm scripts
npm run testui "your test instruction"
npm run test-ui "alternative alias"
npm run ui "shortest alias"
```

### Method 2: Global Install

```bash
cd testdriver-proxy
npm install -g .

# Now use 'testui' from anywhere!
cd ~/my-project
testui "test my app"

cd ~/another-project
testui "visit localhost:3000 and click buttons"
```

### Method 3: Direct Binary

```bash
./bin/testui "your test instruction"
```

### Quick Command Reference

| Command | Usage | Benefits |
|---------|-------|----------|
| `npm run testui "..."` | ⭐ **Recommended** | Easy to remember, works from testdriver-proxy dir |
| `npm run test-ui "..."` | Alternative | Kebab-case style |
| `npm run ui "..."` | Shortest | Quick typing |
| `testui "..."` | After global install | Works from ANY directory |
| `./bin/testui "..."` | Direct binary | Traditional approach |

---

## 🎯 Usage

### Three Ways to Run TestUI

#### Option 1: Generate & Run New Test

```bash
npm run testui "go to myapp.com, click login, and verify dashboard loads"
```

#### Option 2: Upgrade Existing Test

```bash
npm run testui "upgrade ./tests/login.yaml to include error handling"
```

#### Option 3: Run Existing Test

```bash
npm run testui "./tests/checkout-flow.yaml"
```

### Usage Patterns

**Natural Language Testing:**
```bash
# AI generates YAML from your description
npm run testui "test login on https://myapp.com"
npm run testui "click all buttons and verify they work"
npm run ui "navigate to google.com and search for AI"
```

**File Operations:**
```bash
# Execute pre-written YAML tests
npm run testui "./tests/checkout-flow.yaml"
npm run testui "./tests/login-test.yaml"
```

**Enhance Existing Tests:**
```bash
# Combine file + prompt to upgrade tests
npm run testui "./tests/login.yaml also verify logout works"
npm run testui "./tests/checkout.yaml add promo code validation"
```

### Local Development Testing

```bash
# Start your app
npm run dev  # App runs on localhost:3000

# Test it with TestUI
npm run testui "visit localhost:3000, click 'Sign Up', fill email with test@example.com"
```

---

## 🪟 Windows Support

### ✅ Fully Supported!

TestUI works perfectly on Windows thanks to Node.js cross-platform compatibility.

#### Windows Setup

**PowerShell:**
```powershell
# Clone and install
git clone https://github.com/Zeeeepa/cli.git
cd cli\testdriver-proxy
npm install

# Set API key (PowerShell)
$env:ANTHROPIC_API_KEY="your-key-here"

# Run tests!
npm run testui "visit google.com and search"
```

**Command Prompt:**
```cmd
# Set API key (CMD)
set ANTHROPIC_API_KEY=your-key-here

# Run tests
npm run testui "test my app"
```

#### Windows Considerations

- ✅ Node.js scripts work identically
- ✅ Path handling is automatic
- ✅ npm scripts work the same
- ⚠️ Bash scripts (`.sh` files) may need Git Bash or WSL

---

## 🤖 AI Agent Integration

### Integration Methods

TestUI can be integrated into AI agents in three ways:

### Option 1: Subprocess Execution

```python
import subprocess
import json

def run_ui_test(instruction: str) -> dict:
    """Execute UI test via TestUI"""
    result = subprocess.run(
        ["npm", "run", "testui", instruction],
        cwd="/path/to/testdriver-proxy",
        capture_output=True,
        text=True
    )
    
    return {
        "status": "success" if result.returncode == 0 else "failed",
        "output": result.stdout,
        "errors": result.stderr
    }

# Usage
result = run_ui_test("test login flow on myapp.com")
print(result)
```

### Option 2: MCP Server Integration

```python
from mcp.server import Server
from mcp.types import Tool, TextContent

# Create MCP server for TestUI
server = Server("testui-server")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="ui_test",
            description="Run UI tests using natural language",
            inputSchema={
                "type": "object",
                "properties": {
                    "instruction": {"type": "string"}
                }
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "ui_test":
        result = subprocess.run(
            ["npm", "run", "testui", arguments["instruction"]],
            cwd="/path/to/testdriver-proxy",
            capture_output=True,
            text=True
        )
        return [TextContent(type="text", text=result.stdout)]
```

### Option 3: Custom Agent Framework

```python
class UITestingAgent:
    def __init__(self, testui_path: str):
        self.testui_path = testui_path
    
    def test_interface(self, instruction: str):
        """Execute UI test from natural language"""
        result = subprocess.run(
            [f"{self.testui_path}/bin/testui", instruction],
            capture_output=True,
            text=True
        )
        
        # Parse results
        if "✅" in result.stdout:
            return {"status": "passed", "output": result.stdout}
        else:
            return {"status": "failed", "output": result.stdout}

# Usage
agent = UITestingAgent("/path/to/testdriver-proxy")
result = agent.test_interface("test login flow")
```

---

## 🎨 Real-World Examples

### E-commerce Testing

```bash
npm run testui "go to mystore.com, search for 'iPhone 15', add first result to cart, and verify cart shows 1 item"
```

### Form Validation

```bash
npm run testui "visit signup.myapp.com, enter invalid email 'notanemail', submit, and check for error message"
```

### Data Extraction

```bash
npm run testui "go to news.ycombinator.com and extract top 5 story titles with point counts"
```

### GitHub Repository Analysis

```bash
npm run testui "visit github.com/microsoft/playwright and extract description, star count, and fork count"
```

### Wikipedia Research

```bash
npm run testui "search wikipedia for 'artificial intelligence', click first result, extract first paragraph"
```

### Multi-Step Authentication

```bash
npm run testui "go to app.mysite.com, enter email 'user@test.com', click continue, enter password 'pass123', submit, verify dashboard"
```

### Google Search Automation

```bash
npm run testui "go to google.com, search for 'test automation tools', get top 5 results"
```

### Complex Workflows

```bash
npm run testui "visit shopify demo store, add 3 items to cart, apply discount code TEST10, proceed to checkout, verify total is reduced"
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Required - API Key (use ONE of these)
export ANTHROPIC_API_KEY="your-api-key"
export ANTHROPIC_AUTH_TOKEN="your-token"
export ZAI_API_KEY="your-zai-key"
export OPENAI_API_KEY="your-openai-key"

# Optional - Server Configuration
export PORT=8080                    # Proxy server port (default: 8080)
export TESTUI_PROXY_PORT=9876      # TestUI internal port
export MODEL=claude-3-opus         # Override AI model
export LOG_LEVEL=info              # Logging level

# Optional - TestDriver Configuration
export TD_API_KEY="your-td-key"    # TestDriver.ai API key
export TD_API_ROOT="custom-url"    # Custom TestDriver endpoint
```

### Configuration File

Create `.env` file in `testdriver-proxy/`:

```bash
# Copy example
cp .env.example .env

# Edit with your settings
nano .env
```

Example `.env`:

```bash
# API Configuration
ANTHROPIC_API_KEY=sk-ant-xxxxx
MODEL=claude-3-5-sonnet-20241022

# Server Configuration  
PORT=8080
LOG_LEVEL=info

# TestDriver.ai (optional)
TD_API_KEY=td_xxxxx
```

### Custom Port

If default port is in use:

```bash
PORT=3000 npm start
# or
TESTUI_PROXY_PORT=3000 npm run testui "test my app"
```

---

## 🚀 Deployment

### Local Development

```bash
# Start development server
npm run dev

# Start with custom port
PORT=3000 npm run dev
```

### Docker Deployment

#### Build Image

```bash
# Build Docker image
docker build -t testui:latest .

# Or use Docker Compose
docker-compose build
```

#### Run Container

```bash
# Run with Docker
docker run -p 8080:8080 \
  -e ANTHROPIC_API_KEY="your-key" \
  testui:latest

# Or with Docker Compose
docker-compose up -d
```

#### Docker Compose Configuration

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  testui:
    build: .
    ports:
      - "8080:8080"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PORT=8080
      - LOG_LEVEL=info
    volumes:
      - ./tests:/app/tests
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Production Deployment

#### Prerequisites

- Server with Node.js 16+ or Docker
- SSL certificate (Let's Encrypt recommended)
- Reverse proxy (Nginx/Caddy)

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name testui.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name testui

# Configure auto-restart
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs testui
```

#### Systemd Service

Create `/etc/systemd/system/testui.service`:

```ini
[Unit]
Description=TestUI Server
After=network.target

[Service]
Type=simple
User=testui
WorkingDirectory=/opt/testui/testdriver-proxy
Environment=NODE_ENV=production
Environment=ANTHROPIC_API_KEY=your-key
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable testui
sudo systemctl start testui
sudo systemctl status testui
```

---

## 🧪 Testing

### Run All Tests

```bash
# Feature tests (7 tests)
./tests/test-all-testui-usages.sh

# Live website tests (5 tests)
./tests/test-testui-all-usages.sh

# Python unit tests
cd tests && python -m pytest

# Integration tests
npm test
```

### Test Results

All tests have been validated:

#### Feature Tests (7/7 Passed) ✅
- Help command
- Simple prompts  
- File upgrades
- Direct execution
- File not found handling
- No arguments handling
- External URL support

#### Real Website Tests (5/5 Passed) ✅
- Google search automation
- GitHub repository scraping
- Hacker News story extraction
- Wikipedia content extraction
- Example.com analysis

### Manual Testing

```bash
# Test specific feature
npm run testui "visit example.com"

# Test with custom port
TESTUI_PROXY_PORT=3000 npm run testui "test login"

# Test with custom model
MODEL=gpt-4 npm run testui "click buttons"
```

---

## 🏗️ Architecture

### System Overview

```
┌──────────────────┐
│  TestUI Command  │
└────────┬─────────┘
         │ Spawns
         ▼
┌──────────────────┐
│  Proxy Server    │  (Port 9876)
│  (Express.js)    │
└────────┬─────────┘
         │ HTTP
         ▼
┌──────────────────┐
│  LLM Provider    │
│  (Anthropic/     │
│   OpenAI/Z.ai)   │
└────────┬─────────┘
         │ Generates
         ▼
┌──────────────────┐
│  YAML Test File  │
└────────┬─────────┘
         │ Executes
         ▼
┌──────────────────┐
│ TestDriver.ai    │
│ (Browser Control)│
└──────────────────┘
```

### Component Flow

1. **TestUI Command** - Parses user input
2. **Proxy Server** - Routes requests to AI
3. **LLM Provider** - Generates test commands
4. **TestDriver** - Executes browser automation
5. **Cleanup** - Removes temporary files

### Directory Structure

```
testdriver-proxy/
├── bin/
│   ├── testui          # Main CLI command
│   └── context         # Context management
├── lib/
│   ├── ai-client.js    # LLM API integration
│   └── utils.js        # Helper functions
├── src/
│   └── testdriver_proxy/  # Python proxy logic
├── tests/
│   ├── *.yaml          # Test files
│   ├── *.sh            # Test scripts
│   └── *.py            # Python tests
├── server.js           # Express server
├── package.json        # Dependencies
└── README.md           # This file
```

---

## 📚 API Reference

### Available Endpoints

The proxy server provides 7 AI-powered endpoints:

#### 1. `/api/:version/testdriver/input`

Convert natural language to YAML test commands.

**Request:**
```bash
curl -X POST http://localhost:8080/api/1.0.0/testdriver/input \
  -H "Content-Type: application/json" \
  -d '{"input": "Click the login button"}'
```

**Response:**
```json
{
  "commands": [
    {
      "command": "hover-text",
      "text": "Login",
      "action": "click"
    }
  ]
}
```

#### 2. `/api/:version/testdriver/error`

Handle test failures and generate recovery strategies.

#### 3. `/api/:version/testdriver/check`

Verify task completion.

#### 4. `/api/:version/testdriver/generate`

Generate comprehensive test scenarios.

#### 5. `/api/:version/testdriver/assert`

Create assertion commands.

#### 6. `/api/:version/testdriver/hover/text`

Find text elements for interaction.

#### 7. `/api/:version/testdriver/hover/image`

Match images for visual testing.

### Health Check

```bash
curl http://localhost:8080/health
```

---

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Use different port
TESTUI_PROXY_PORT=8080 npm run testui "test my app"
```

#### API Key Not Set

```bash
# Check if set
echo $ANTHROPIC_API_KEY

# Set if missing
export ANTHROPIC_API_KEY="your-key-here"
```

#### Test Failing

```bash
# Check logs
npm run testui "your test" 2>&1 | tee test.log

# Increase timeout
TD_TIMEOUT=60000 npm run testui "slow test"
```

#### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Windows Path Issues

```powershell
# Use forward slashes
npm run testui "./tests/test.yaml"

# Or absolute paths
npm run testui "C:/Users/you/tests/test.yaml"
```

### Debug Mode

```bash
# Enable verbose logging
LOG_LEVEL=debug npm run testui "test"

# Check proxy logs
tail -f proxy.log
```

### Getting Help

- 📖 [TestDriver.ai Documentation](https://docs.testdriver.ai)
- 💬 [Discord Community](https://discord.com/invite/cWDFW8DzPm)
- 🐛 [Report Issues](https://github.com/Zeeeepa/cli/issues)
- 📧 [Email Support](mailto:support@testdriver.ai)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- [TestDriver.ai](https://testdriver.ai) - Browser automation platform
- [Anthropic](https://anthropic.com) - Claude AI models
- [Z.ai](https://z.ai) - GLM-4.5V vision model
- [OpenAI](https://openai.com) - GPT models

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

**Ready to test smarter, not harder?** 🚀

Get started: `npm run testui "your first test"`

