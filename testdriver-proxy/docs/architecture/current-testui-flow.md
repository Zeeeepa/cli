# Current TestUI Architecture & Flow Documentation

## Overview

TestUI is a CLI tool that enables natural language-based testing of web applications using AI. It acts as a wrapper around TestDriver.ai with a custom Z.ai proxy server.

## Entry Point: `bin/testui`

### Command-Line Argument Parsing

The `testui` binary accepts three modes of operation:

1. **PROMPT Mode** - Natural language test description
   ```bash
   testui PROMPT="login with demo@testdriver.ai"
   testui "click all buttons"  # Positional argument
   ```

2. **TEST Mode** - YAML test file execution
   ```bash
   testui TEST="tests/login.yaml"
   ```

3. **APP Mode** - External application URL
   ```bash
   testui APP="http://your-app:4000" PROMPT="test instructions"
   ```

### Argument Parsing Logic

Located in `parseArgs()` function (lines 26-49):
- Scans `process.argv.slice(2)` for arguments
- Recognizes `PROMPT=`, `TEST=`, `APP=` patterns
- Falls back to first non-flag argument as prompt
- Returns parsed object with `{ prompt, testFile, appUrl }`

## Current Architecture

```
┌─────────────────────────────────────────────────────┐
│                    User CLI                          │
│              testui PROMPT="..."                     │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│              bin/testui (Node.js)                    │
│  • Parse arguments (PROMPT/TEST/APP)                 │
│  • Validate ANTHROPIC_API_KEY                        │
│  • Start test app (port 4000) if needed              │
│  • Start proxy server (port 9876)                    │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│         Proxy Server (server.js:9876)                │
│  • Intercepts TestDriver.ai API calls                │
│  • Forwards to Z.ai API                              │
│  • Handles authentication & rate limiting            │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│         TestDriver.ai (via npx testdriverai)         │
│  • Receives natural language prompt                  │
│  • Generates Selenium commands                       │
│  • Executes browser automation                       │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│           Target Web Application                     │
│       (localhost:4000 or external URL)               │
└─────────────────────────────────────────────────────┘
```

## Z.ai API Integration Pattern

### API Key Validation
- **Location**: Line 91-96 in `bin/testui`
- **Environment Variable**: `ANTHROPIC_API_KEY`
- **Validation**: Checks existence before startup
- **Error Handling**: Exits with code 1 if missing

### API Endpoint Configuration
- **Environment Variable**: `TD_API_ROOT=http://localhost:9876`
- **Set in**: Line 175 when spawning testdriver
- **Purpose**: Redirects TestDriver.ai to use proxy instead of production API

### Proxy Server Integration
- **File**: `server.js` (33KB, complex routing logic)
- **Port**: 9876
- **Environment**: Inherits `ANTHROPIC_API_KEY` from parent process
- **Purpose**: Translate TestDriver.ai API → Z.ai API

## Current Data Flow

### Input → Execution Flow

1. **User Input**
   ```
   testui PROMPT="login with admin password secret123"
   ```

2. **Argument Parsing**
   ```javascript
   parsed = {
     prompt: "login with admin password secret123",
     testFile: null,
     appUrl: null
   }
   ```

3. **Process Spawning**
   - Test app spawned (if needed): `node tests/ui/test-app/server.js`
   - Proxy server spawned: `node server.js`
   - Wait for ports to be available

4. **TestDriver Execution**
   ```javascript
   npx testdriverai run \
     --url http://localhost:4000 \
     --prompt "login with admin password secret123"
   ```

5. **API Call Flow**
   ```
   TestDriver → http://localhost:9876 (proxy) → Z.ai API
   ```

6. **Browser Automation**
   - TestDriver uses Selenium WebDriver
   - Executes commands against target app
   - Returns results to CLI

## Credential Handling

### Current State: ❌ NO CREDENTIAL FLOW

- **Issue**: No mechanism to pass credentials to test execution
- **Problem**: Hardcoded credentials in prompts (insecure)
- **Example**: `PROMPT="login with admin password secret123"` exposes secrets

### Where Credentials Would Need Integration:
1. **CLI Parsing** - Parse credential arguments
2. **Environment Injection** - Pass to TestDriver via env vars
3. **Prompt Templating** - Replace placeholders in test descriptions

## Output Format

### stdout
- Colorized logs using ANSI escape codes
- Progress indicators (1️⃣, 2️⃣, 3️⃣, ✅, ❌)
- Test execution output from TestDriver (stdio: 'inherit')

### stderr
- Error messages from spawned processes
- Captured but not displayed unless process fails

### Exit Codes
- `0`: Success
- `1`: Error (API key missing, port conflicts, test failure)
- `130`: User interrupt (SIGINT)

## File I/O Operations

### Read Operations
1. **Test File Loading** (line 156-158)
   - Reads YAML test file when `TEST=` provided
   - Path: Relative to current working directory

2. **Server Script Validation** (line 105-108)
   - Checks existence of `tests/ui/test-app/server.js`
   - Validates test app availability

### Write Operations
- **None currently** - All output to stdout/stderr
- No artifact generation (screenshots, logs, reports)

## Error Handling Flows

### Pre-execution Errors
1. **Missing API Key** → Show setup instructions → Exit 1
2. **Missing Test App** → Show file path → Exit 1
3. **Port Conflicts** → Kill processes → Exit 1
4. **No Test Specified** → Show usage help → Exit 1

### Runtime Errors
1. **Process Crash** → Cleanup spawned processes → Exit with child exit code
2. **SIGINT** → Cleanup (line 196-201) → Exit 130

### Cleanup Always Runs
```javascript
process.on('SIGINT', () => {
  if (testApp) testApp.kill();
  proxyServer.kill();
  process.exit(130);
});
```

## Current Dependencies

### Direct CLI Dependencies (bin/testui)
- **Node.js Built-ins**:
  - `child_process.spawn` - Process management
  - `http` - Port checking
  - `fs` - File system validation
  - `path` - Path resolution

### External Dependencies (via npx)
- **testdriverai** - Not installed locally, executed via npx
- Version: Unknown (uses latest from npm)

### Proxy Server Dependencies (server.js)
- See `package.json` for full list (52 dependencies total)
- Key: axios, express, selenium-webdriver

## Modes of Operation

### Mode 1: PROMPT (Natural Language)
```bash
testui PROMPT="test login flow"
```
- **Flow**: CLI → Proxy → TestDriver → Z.ai → Commands → Browser
- **Use Case**: Ad-hoc testing, exploration
- **Limitation**: No credential injection

### Mode 2: TEST (YAML File)
```bash
testui TEST="tests/login.yaml"
```
- **Flow**: CLI → Proxy → TestDriver → YAML Parser → Commands → Browser
- **Use Case**: Repeatable test suites
- **Limitation**: YAML format determined by TestDriver.ai

### Mode 3: APP (External Application)
```bash
testui APP="http://staging.example.com" PROMPT="..."
```
- **Flow**: Same as PROMPT but targets external URL
- **Use Case**: Testing deployed applications
- **Limitation**: External app must be accessible

## Integration Points for Sandbox

### Where Sandbox Wrapper Will Be Injected

1. **Before Browser Launch** (New Phase)
   - Current: TestDriver spawns browser directly
   - Target: Sandbox spawns Chrome → TestDriver connects via CDP
   - Location: Between line 172-179 (testDriver spawn)

2. **YAML Generation Point** (New Phase)
   - Current: Natural language → TestDriver (internal)
   - Target: Natural language → Z.ai → YAML → Sandbox executor
   - Location: Before spawning testdriverai

3. **Credential Flow** (New)
   - Current: None
   - Target: CLI → Environment → Sandbox → Executor
   - Location: Line 175-177 environment setup

## Backward Compatibility Requirements

### Must Preserve
1. ✅ CLI argument syntax (`PROMPT=`, `TEST=`, `APP=`)
2. ✅ Environment variable usage (`ANTHROPIC_API_KEY`)
3. ✅ Exit codes and error messages
4. ✅ Colorized output format

### Can Modify
1. ⚠️ Internal execution flow (transparent to user)
2. ⚠️ Process spawning mechanism
3. ⚠️ API integration pattern
4. ⚠️ Add new features (credentials, artifacts)

### Must Add
1. ➕ Credential parsing and injection
2. ➕ Sandbox configuration
3. ➕ YAML executor
4. ➕ Network isolation
5. ➕ Artifact collection (screenshots, logs)

## Current Limitations

### Security
- ❌ No credential management
- ❌ No network isolation
- ❌ Secrets exposed in process args

### Observability
- ❌ No structured logging
- ❌ No test artifacts saved
- ❌ No test history/replay

### Flexibility
- ❌ Locked to TestDriver.ai format
- ❌ No custom action definitions
- ❌ No parallel execution

### Resource Management
- ⚠️ No sandbox isolation
- ⚠️ Browser runs unrestricted
- ⚠️ Port conflicts not handled gracefully

## Next Steps for Sandbox Integration

Based on this analysis, the sandbox integration should:

1. **Replace TestDriver Spawning** with sandbox-wrapped Chrome
2. **Add LLM YAML Generation** before execution
3. **Implement Custom Executor** for YAML actions
4. **Add Credential Flow** through environment/CLI
5. **Wrap in Network Sandbox** for localhost-only access
6. **Collect Artifacts** (screenshots, logs) from sandbox

See `integration-points.md` for detailed injection strategy.

