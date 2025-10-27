# TestUI - Next Generation AI-Powered Testing

> Autonomous AI agent for end-to-end testing of web & desktop applications with natural language commands and YAML-based test specifications.

[![npm version](https://img.shields.io/npm/v/testdriverai.svg)](https://www.npmjs.com/package/testdriverai)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

## 🚀 Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/Zeeeepa/cli.git
cd cli

# Install dependencies
npm install

# Install globally (optional - enables `testui` and `testdriverai` commands)
npm link
```

### Setup API Key

Get your free Z.ai API key at [https://z.ai](https://z.ai)

```bash
# Configure environment
export ANTHROPIC_API_URL="https://api.z.ai/v1"
export ANTHROPIC_API_KEY="your-zai-api-key-here"
export ANTHROPIC_MODEL="glm-4.5v"

# Persist to shell config
echo 'export ANTHROPIC_API_KEY="your-key"' >> ~/.bashrc
```

### Your First Test

```bash
# Natural language testing
testui "navigate to google.com and search for testdriver"

# YAML-based test
testui TEST="tests/login.yaml"

# Test external app
testui APP="http://localhost:3000" PROMPT="test all features"
```

---

## 📖 Usage

### Command Syntax

TestUI supports multiple invocation styles:

```bash
# 1. Natural Language (Shorthand)
testui "login with demo@testdriver.ai"

# 2. Explicit PROMPT syntax
testui PROMPT="navigate to example.com and click login"

# 3. YAML Test File
testui TEST="tests/my-test.yaml"

# 4. External App Testing
testui APP="http://localhost:8080" PROMPT="test all UI features"

# 5. Help
testui --help
```

### YAML Test Specification

Create structured, repeatable tests with YAML:

```yaml
version: "1.0"
metadata:
  name: "Login Test"
  description: "Test user login flow"

sandbox:
  network:
    allowedDomains: ["localhost", "127.0.0.1", "example.com"]
  filesystem:
    allowWrite: ["./screenshots", "./logs"]

actions:
  - type: navigate
    url: "http://localhost:3000"
    waitUntil: "networkidle"

  - type: click
    selector: "#login-button"
    timeout: 5000

  - type: type
    selector: "#email"
    text: "demo@example.com"

  - type: screenshot
    path: "./screenshots/after-login.png"
    fullPage: true

  - type: assertExists
    selector: ".dashboard"
    message: "Dashboard should be visible after login"
```

### Action Types

| Action | Description | Required Fields |
|--------|-------------|----------------|
| `navigate` | Navigate to URL | `url` |
| `click` | Click element | `selector` |
| `type` | Type text into input | `selector`, `text` |
| `wait` | Wait for condition | `condition` (selector/timeout/navigation) |
| `screenshot` | Capture screenshot | `path` |
| `evaluate` | Run JavaScript | `script` |
| `assertExists` | Assert element exists | `selector` |

---

## 🔒 Sandbox Integration

TestUI uses `@anthropic-ai/sandbox-runtime` for secure, sandboxed browser execution.

### Features

- ✅ **Filesystem Restrictions** - Control read/write permissions
- ✅ **Network Isolation** - Whitelist allowed domains
- ✅ **Platform Support** - macOS (sandbox-exec) & Linux (bubblewrap)
- ✅ **Localhost Testing** - Test local development servers
- ✅ **Security Boundaries** - Prevent unauthorized access

### Sandbox Configuration

```yaml
sandbox:
  network:
    allowedDomains: ["localhost", "127.0.0.1", "*.local"]
    allowLocalBinding: true
  
  filesystem:
    allowRead: ["."]
    allowWrite: ["./screenshots", "./logs"]
    denyRead: ["~/.ssh", "~/.aws", "~/.config"]
    denyWrite: ["/etc", "/usr", "/System"]
```

### Platform Requirements

**macOS:**
- macOS 12+ (Monterey, Ventura, Sonoma)
- `sandbox-exec` (built-in)
- Chrome/Chromium browser

**Linux:**
- Ubuntu 20.04+, Debian 11+
- `bubblewrap` (`sudo apt install bubblewrap`)
- Chrome/Chromium browser (`sudo apt install chromium-browser`)

---

## 🛠️ Configuration

### Environment Variables

Create `.env` file:

```bash
# Z.ai API Configuration
ANTHROPIC_API_URL=https://api.z.ai/v1
ANTHROPIC_API_KEY=your-key-here
ANTHROPIC_MODEL=glm-4.5v

# TestUI Configuration
TESTUI_SANDBOX_ENABLED=true
TESTUI_VERBOSE=false
TESTUI_SCREENSHOT_DIR=./screenshots
TESTUI_LOGS_DIR=./logs

# Performance Tuning
TESTUI_TIMEOUT=30000
TESTUI_MAX_RETRIES=3

# Chrome Configuration (optional)
CHROME_BIN=/path/to/chrome  # Override auto-detection
```

### Sandbox Config File

Create `testdriver-proxy/sandbox-config.js`:

```javascript
module.exports = {
  network: {
    allowedDomains: ['localhost', '127.0.0.1', '*.local'],
    deniedDomains: ['*'],
    allowLocalBinding: true,
  },
  filesystem: {
    allowRead: ['.'],
    allowWrite: ['./screenshots', './logs'],
    denyRead: ['~/.ssh', '~/.aws'],
    denyWrite: ['/etc', '/usr', '/System'],
  },
};
```

---

## 📊 Examples

### Example 1: Simple Navigation Test

```yaml
version: "1.0"
metadata:
  name: "Google Search Test"

actions:
  - type: navigate
    url: "https://google.com"
  
  - type: screenshot
    path: "./screenshots/google-homepage.png"
```

### Example 2: Form Testing

```yaml
version: "1.0"
metadata:
  name: "Contact Form Test"

actions:
  - type: navigate
    url: "http://localhost:3000/contact"

  - type: type
    selector: "#name"
    text: "John Doe"

  - type: type
    selector: "#email"
    text: "john@example.com"

  - type: click
    selector: "#submit-button"

  - type: wait
    condition: "selector"
    selector: ".success-message"
    timeout: 5000

  - type: screenshot
    path: "./screenshots/success.png"
```

### Example 3: Authentication Flow

```yaml
version: "1.0"
metadata:
  name: "Login Test with Credentials"

actions:
  - type: navigate
    url: "http://localhost:8080/login"

  - type: type
    selector: "#username"
    text: "admin"

  - type: type
    selector: "#password"
    text: "secret123"

  - type: click
    selector: "#login-btn"

  - type: wait
    condition: "navigation"
    timeout: 10000

  - type: assertExists
    selector: ".dashboard"
    message: "User should be redirected to dashboard"

  - type: screenshot
    path: "./screenshots/dashboard.png"
    fullPage: true
```

---

## 🧪 Testing & Validation

### Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# All tests
npm run test:all
```

### Validation

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

---

## 🐛 Troubleshooting

### Common Issues

**"ANTHROPIC_API_KEY not set"**
```bash
export ANTHROPIC_API_KEY="your-key"
```

**"Chrome binary not found"**
```bash
# macOS
brew install --cask google-chrome

# Linux
sudo apt install chromium-browser

# Or set custom path
export CHROME_BIN="/path/to/chrome"
```

**"Sandbox violation detected"**
- Check `sandbox-config.js` allowedDomains/filesystem permissions
- Add required domains to `allowedDomains` array
- Add required paths to `allowWrite`/`allowRead` arrays

**"Operation not permitted" errors**
- Ensure sandbox-runtime is installed: `npm install @anthropic-ai/sandbox-runtime`
- macOS: Verify sandbox-exec is available (built-in macOS 12+)
- Linux: Install bubblewrap: `sudo apt install bubblewrap`

### Debug Mode

```bash
# Enable verbose logging
TESTUI_VERBOSE=true testui "your test query"

# Debug mode
npm run debug
```

---

## 📚 API Documentation

### YAMLExecutor Class

```typescript
import { YAMLExecutor } from './src/yaml-executor/yaml-executor';

const executor = new YAMLExecutor();
const result = await executor.execute(yamlSpec);

// Result structure
interface ExecutionResult {
  success: boolean;
  duration: number;
  actionsCompleted: number;
  error?: {
    action: number;
    type: string;
    message: string;
  };
  screenshots: string[];
  variables: Record<string, any>;
}
```

### Schema Validation

```typescript
import { validateYAMLSpec, safeValidateYAMLSpec } from './src/yaml-executor/yaml-schema';

// Throws on validation error
const spec = validateYAMLSpec(data);

// Returns validation result
const result = safeValidateYAMLSpec(data);
if (result.success) {
  console.log('Valid spec:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}
```

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone and install
git clone https://github.com/Zeeeepa/cli.git
cd cli
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build
npm run build
```

---

## 📄 License

ISC License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **GitHub Repository:** https://github.com/Zeeeepa/cli
- **Sandbox Runtime:** https://github.com/Zeeeepa/sandbox-runtime
- **Z.ai Platform:** https://z.ai
- **Documentation:** [Coming Soon]

---

## 💡 Support

- **Issues:** https://github.com/Zeeeepa/cli/issues
- **Discussions:** https://github.com/Zeeeepa/cli/discussions

---

**Built with ❤️ for autonomous AI testing** 🤖🚀

**Version:** 6.1.10  
**Last Updated:** 2025-10-27

