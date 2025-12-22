# 🔐 Local Sandbox Setup Guide

## Overview

TestUI now uses **local sandbox execution** via `@anthropic-ai/sandbox-runtime` instead of remote cloud sandboxes. This enables testing applications on localhost with full security boundaries.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will automatically install:
- `@anthropic-ai/sandbox-runtime` from GitHub
- All other required dependencies

### 2. Install Platform Requirements

**macOS:**
```bash
# sandbox-exec is built-in (macOS 12+)
# Install Chrome if not present:
brew install --cask google-chrome
```

**Linux (Ubuntu/Debian):**
```bash
# Install bubblewrap (sandbox runtime)
sudo apt install bubblewrap

# Install Chromium browser
sudo apt install chromium-browser
```

### 3. Set API Key

```bash
export ANTHROPIC_API_KEY="your-zai-api-key"
```

### 4. Build (Optional)

```bash
npm run build  # No-op, but included for consistency
```

### 5. Run Tests

```bash
# Using npm script
npm run testui "test localhost:8080 login flow"

# Or directly
testui "on localhost:8080 test all UI features using token abc123 username admin password secret"
```

## Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────┐
│ User: testui "test localhost:8080..."      │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│ testui script initializes LOCAL sandbox    │
│ • Finds Chrome binary                       │
│ • Configures filesystem/network permissions │
│ • Extracts domains from prompt              │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│ Starts proxy server (port 9876)            │
│ • Translates prompts → YAML via LLM        │
│ • Uses Z.ai GLM-4.5V                       │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│ Spawns testdriverai with sandbox env       │
│ • USE_LOCAL_SANDBOX=true                   │
│ • SANDBOXED_CHROME_PATH=/path/to/chrome    │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│ Chrome launches IN sandbox                 │
│ • Restricted filesystem access             │
│ • Localhost network access allowed         │
│ • Security boundaries enforced             │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│ YAML commands execute against localhost    │
│ • Screenshots saved to ./screenshots       │
│ • Logs saved to ./logs                     │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│ Results returned, sandbox cleaned up       │
└─────────────────────────────────────────────┘
```

## Security Configuration

### Filesystem Permissions

**Allowed Write:**
- `./screenshots` - Test screenshots
- `./logs` - Execution logs
- `/tmp/testui-*` - Temporary files

**Denied Read:**
- `~/.ssh` - SSH keys
- `~/.aws` - AWS credentials
- `~/.config` - User configuration
- `/etc/shadow`, `/etc/passwd` - System files

### Network Permissions

**Allowed Domains:**
- `localhost`, `127.0.0.1`, `0.0.0.0`
- `*.local`, `*.localhost`
- Dynamically added from test prompts

**Allowed Ports:**
- 3000, 4000, 5000, 8000, 8080, 8888, 9000, 9876

### Configuration File

Edit `testdriver-proxy/sandbox-config.js` to customize:

```javascript
module.exports = {
  filesystem: {
    allowWrite: ['./screenshots', './logs'],
    denyRead: ['~/.ssh', '~/.aws']
  },
  network: {
    allowedDomains: ['localhost', '127.0.0.1'],
    allowedPorts: [8080, 9876]
  },
  security: {
    ignoreViolations: false,  // Set to true for debugging
    verbose: process.env.TESTUI_VERBOSE === 'true'
  }
};
```

## Usage Examples

### Basic Navigation

```bash
testui "visit localhost:4000 and click the login button"
```

### Form Testing

```bash
testui "on localhost:8080 fill the email field with test@example.com"
```

### Authentication Flow

```bash
testui "test localhost:3000 login using username admin password secret123"
```

### Complex Workflow

```bash
testui "on localhost:8080 test all UI features: \
  1. Click features section \
  2. Select product parameters \
  3. Add to cart \
  4. Verify cart persists"
```

### With Credentials

```bash
testui "test localhost:5000 using token abc123 username john password pass456"
```

## Environment Variables

### Required

- `ANTHROPIC_API_KEY` - Your Z.ai API key

### Optional

- `TESTUI_VERBOSE=true` - Enable verbose sandbox logging
- `TESTUI_SANDBOX_PLATFORM=auto|macos|linux` - Override platform detection
- `CHROME_BIN=/path/to/chrome` - Override Chrome binary location
- `TESTUI_TIMEOUT=30000` - Test timeout in milliseconds
- `TESTUI_MAX_RETRIES=3` - Maximum retry attempts

## Troubleshooting

### "Chrome not found"

**macOS:**
```bash
brew install --cask google-chrome
# Or set manually:
export CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

**Linux:**
```bash
sudo apt install chromium-browser
# Or set manually:
export CHROME_BIN="/usr/bin/chromium"
```

### "sandbox-runtime not installed"

```bash
npm install github:Zeeeepa/sandbox-runtime
```

### "bubblewrap: command not found" (Linux)

```bash
sudo apt install bubblewrap
```

### Sandbox Violations

If you see sandbox violation errors:

1. **Check logs** for denied operations
2. **Add paths** to `sandbox-config.js` allowWrite/allowRead
3. **Add domains** to `sandbox-config.js` allowedDomains
4. **Temporarily disable** enforcement:
   ```javascript
   // sandbox-config.js
   security: { ignoreViolations: true }
   ```

### Enable Debug Logging

```bash
export TESTUI_VERBOSE=true
testui "your test query"
```

## Differences from Remote Sandbox

### ✅ Advantages

- **Localhost Access** - Test apps on localhost directly
- **No Network Latency** - Faster execution
- **Privacy** - No data leaves your machine
- **Offline Testing** - Works without internet
- **Cost** - No cloud sandbox fees

### ⚠️ Considerations

- **Platform Dependencies** - Requires bubblewrap (Linux) or sandbox-exec (macOS)
- **Chrome Required** - Must have Chrome/Chromium installed locally
- **Resource Usage** - Uses local CPU/memory

## Migration from Remote Sandbox

If you were using remote TestDriver.ai sandbox:

**Before:**
```bash
TD_API_ROOT=https://testdriver.ai npx testdriverai run --url https://example.com test.yaml
```

**After:**
```bash
testui "test localhost:8080 following test.yaml"
```

The local sandbox is automatically used when running via the `testui` command. Remote sandbox mode is disabled by setting `USE_LOCAL_SANDBOX=true`.

## Architecture Files

Key implementation files:

- `testdriver-proxy/bin/testui` - Main orchestrator
- `testdriver-proxy/lib/LocalSandboxManager.js` - Sandbox wrapper
- `testdriver-proxy/lib/chrome-finder.js` - Chrome detection
- `testdriver-proxy/sandbox-config.js` - Security policies
- `agent/lib/sandbox.js` - Sandbox factory (local vs remote)

## Support

For issues or questions:

1. Check logs with `TESTUI_VERBOSE=true`
2. Review sandbox violations
3. Verify Chrome/Chromium installed
4. Check network/filesystem permissions

## Next Steps

- [ ] Run first test: `testui "visit localhost:4000"`
- [ ] Review `sandbox-config.js` for your security needs
- [ ] Add custom allowed domains if needed
- [ ] Set up CI/CD with sandbox (see CI_SETUP.md)

---

**Built with security and localhost testing in mind.** 🔐🚀

