# TestUI - AI-Powered Test Automation

AI-powered test automation using natural language. Powered by glm-4.5V vision model.

## 🚀 Quick Start

```bash
# Clone and install
git clone <repository-url>
cd cli/testdriver-proxy
npm install

# Set your API key
export ANTHROPIC_API_KEY="your-api-key-here"

# Run your first test!
testui --prompt="test login on https://example.com"
```

## 📦 Installation

```bash
cd cli/testdriver-proxy
npm install
```

The `testui` command is now available globally via npm bin link!

## 🎯 Usage

### Natural Language Testing

```bash
# AI generates YAML test from your prompt and runs it
testui --prompt="test login on https://myapp.com"
testui --prompt="click all buttons and verify they work"
testui "navigate to google.com and search for AI"  # Shorthand
```

### Run Existing YAML Tests

```bash
# Execute pre-written YAML test files
testui --file="tests/checkout-flow.yaml"
testui --file="tests/login-test.yaml"
```

### Enhance Existing YAML

```bash
# Combine both to enhance existing tests
testui --file="tests/login.yaml" --prompt="also verify logout works"
testui --file="tests/checkout.yaml" --prompt="add promo code validation"
```

## 🔧 How It Works

1. **Proxy Server**: Starts automatically on port 9876 (configurable)
2. **AI Processing**: Sends prompt to glm-4.5V via `/api/v1/testdriver/input`
3. **YAML Generation**: AI generates structured test commands
4. **Auto-Execute**: Runs the generated test with TestDriver.ai
5. **Cleanup**: Automatically cleans up temp files

### TD_API_ROOT

Automatically configured to point to the proxy server:
```
TD_API_ROOT=http://localhost:{proxyPort}
```

## ⚙️ Configuration

### Environment Variables

```bash
# Required
export ANTHROPIC_API_KEY="your-api-key"

# Optional
export TESTUI_PROXY_PORT=9876      # Custom proxy port
export MODEL=glm-4.5V               # Override AI model
```

### Custom Port

If port 9876 is in use:
```bash
TESTUI_PROXY_PORT=3000 testui --prompt="test my app"
```

## 📝 Examples

### Test Any Website

```bash
testui --prompt="go to reddit.com and verify homepage loads"
testui --prompt="test checkout flow on shopify.com/demo"
testui --prompt="verify all links on example.com are working"
```

### Complex Testing

```bash
testui --prompt="test login with user@example.com on https://myapp.com, then navigate to dashboard and verify profile loads"
```

### Enhance Existing Tests

```bash
# Start with a base test
testui --file="tests/basic-login.yaml" \
      --prompt="add 2FA verification and check session timeout"
```

## 🎨 Features

- ✅ **Natural Language**: Write tests in plain English
- ✅ **URL Aware**: Include URLs directly in prompts
- ✅ **Auto-Cleanup**: Temp files cleaned automatically
- ✅ **Vision AI**: glm-4.5V model for UI understanding
- ✅ **Flexible**: Enhance existing tests or create new ones
- ✅ **Smart Proxy**: Automatic TD_API_ROOT configuration

## 🏗️ Architecture

```
testui command
    ↓
Starts proxy server (port 9876)
    ↓
Prompt → /api/v1/testdriver/input
    ↓
glm-4.5V generates YAML
    ↓
TestDriver.ai runs test
    ↓
Results + auto-cleanup
```

## 🔍 Available Endpoints

The proxy server provides 7 AI-powered endpoints:

1. `/api/:version/testdriver/input` - Natural language → YAML
2. `/api/:version/testdriver/error` - Error recovery
3. `/api/:version/testdriver/check` - Task verification
4. `/api/:version/testdriver/generate` - Test generation
5. `/api/:version/testdriver/assert` - Assertions
6. `/api/:version/testdriver/hover/text` - Text finding
7. `/api/:version/testdriver/hover/image` - Image matching

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Use a different port
TESTUI_PROXY_PORT=8080 testui --prompt="test my app"
```

### API Key Not Set

```bash
export ANTHROPIC_API_KEY="your-key-here"
testui --help  # Verify it's set
```

### Test Failing

```bash
# Check logs
testui --prompt="your test" 2>&1 | tee test.log
```

## 📚 Model Configuration

Default model: **glm-4.5V**

Override if needed:
```bash
MODEL=glm-4-plus testui --prompt="test login"
```

## 🔗 Links

- [TestDriver.ai Documentation](https://testdriver.ai)
- [Z.ai API](https://api.z.ai)

## 📄 License

MIT

---

**Ready to test smarter, not harder?** 🚀

