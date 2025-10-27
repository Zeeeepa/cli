# Sandbox-Runtime API Reference

## Overview

`@anthropic-ai/sandbox-runtime` (v0.0.1) - A lightweight sandboxing tool for enforcing filesystem and network restrictions on arbitrary processes at the OS level, without requiring a container.

**Repository**: https://github.com/Zeeeepa/sandbox-runtime  
**Package**: `@anthropic-ai/sandbox-runtime`  
**Node Version**: >=18.0.0  
**Platform Support**: macOS (sandbox-exec), Linux (bubblewrap)

## Installation

```bash
npm install @anthropic-ai/sandbox-runtime
```

## Core Architecture

### Main Components

1. **SandboxManager** - Primary API for process sandboxing
2. **SandboxViolationStore** - Real-time violation monitoring
3. **Platform Wrappers** - OS-specific implementations
   - `macos-sandbox-utils.ts` - macOS sandbox-exec wrapper
   - `linux-sandbox-utils.ts` - Linux bubblewrap wrapper
4. **Network Proxies**
   - `http-proxy.ts` - HTTP/HTTPS filtering proxy
   - `socks-proxy.ts` - SOCKS5 proxy for other protocols

### Configuration System

```typescript
import { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime'

const config: SandboxRuntimeConfig = {
  network: {
    allowedDomains: ['localhost', '127.0.0.1', 'anthropic.com'],
    deniedDomains: ['*'] // Block all by default
  },
  filesystem: {
    allowRead: ['.', '/tmp'],
    denyRead: ['~/.ssh', '~/.aws'],
    allowWrite: ['./screenshots', './logs'],
    denyWrite: ['/etc', '/usr']
  },
  allowUnixSockets: ['/var/run/docker.sock'],
  allowLocalBinding: false,
  ignoreViolations: {
    filesystem: false,
    network: false
  }
}
```

## SandboxManager API

### Public Methods

#### `initialize(config, callback?, enableLogMonitor?)`

Initialize the sandbox manager with configuration.

```typescript
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'

await SandboxManager.initialize(
  config,
  async (violation) => {
    // Handle sandbox violation
    console.log('Violation:', violation)
    return false // Deny the request
  },
  true // Enable log monitor (macOS only)
)
```

**Parameters**:
- `config: SandboxRuntimeConfig` - Sandbox configuration
- `callback?: SandboxAskCallback` - Optional callback for violation handling
- `enableLogMonitor?: boolean` - Enable violation log monitoring (macOS)

**Returns**: `Promise<void>`

---

#### `wrapWithSandbox(command)`

Wrap a command string with sandbox restrictions.

```typescript
const wrappedCommand = await SandboxManager.wrapWithSandbox('curl https://example.com')
// Returns platform-specific wrapped command
```

**Parameters**:
- `command: string` - Command to wrap

**Returns**: `Promise<string>` - Wrapped command with sandbox restrictions

---

#### `waitForNetworkInitialization()`

Wait for network proxies to be ready.

```typescript
const initialized = await SandboxManager.waitForNetworkInitialization()
if (initialized) {
  // Proxies are ready
}
```

**Returns**: `Promise<boolean>` - True if initialization successful

---

#### `getSandboxViolationStore()`

Get the violation store for monitoring.

```typescript
const store = SandboxManager.getSandboxViolationStore()
const violations = store.getViolations()
```

**Returns**: `SandboxViolationStore` - Violation store instance

---

#### `reset()`

Clean up and reset the sandbox manager.

```typescript
await SandboxManager.reset()
```

**Returns**: `Promise<void>`

---

#### `isSupportedPlatform(platform)`

Check if platform is supported.

```typescript
import { getPlatform } from '@anthropic-ai/sandbox-runtime'

const platform = getPlatform()
const supported = SandboxManager.isSupportedPlatform(platform)
```

**Returns**: `boolean`

---

#### `isSandboxingEnabled()`

Check if sandboxing is currently enabled.

```typescript
const enabled = SandboxManager.isSandboxingEnabled()
```

**Returns**: `boolean`

---

#### Configuration Getters

```typescript
// Get filesystem read configuration
const fsRead = SandboxManager.getFsReadConfig()

// Get filesystem write configuration  
const fsWrite = SandboxManager.getFsWriteConfig()

// Get network restriction configuration
const network = SandboxManager.getNetworkRestrictionConfig()

// Get allowed Unix sockets
const sockets = SandboxManager.getAllowUnixSockets()

// Get local binding permission
const localBinding = SandboxManager.getAllowLocalBinding()

// Get ignore violations config
const ignoreViolations = SandboxManager.getIgnoreViolations()

// Get proxy ports
const httpPort = SandboxManager.getProxyPort()
const socksPort = SandboxManager.getSocksProxyPort()

// Get Linux socket paths (Linux only)
const httpSocket = SandboxManager.getLinuxHttpSocketPath()
const socksSocket = SandboxManager.getLinuxSocksSocketPath()
```

---

#### `annotateStderrWithSandboxFailures(command, stderr)`

Annotate stderr output with sandbox failure information.

```typescript
const annotated = SandboxManager.annotateStderrWithSandboxFailures(
  'curl https://blocked.com',
  'curl: (7) Failed to connect'
)
```

**Returns**: `string` - Annotated error message

---

#### `getLinuxGlobPatternWarnings()`

Get warnings about glob patterns (Linux only).

```typescript
const warnings = SandboxManager.getLinuxGlobPatternWarnings()
```

**Returns**: `string[]` - List of warnings

## SandboxViolationStore

Monitor and track sandbox violations in real-time.

```typescript
const store = SandboxManager.getSandboxViolationStore()

// Get all violations
const violations = store.getViolations()

// Get violations by type
const fsViolations = store.getViolationsByType('filesystem')
const netViolations = store.getViolationsByType('network')

// Clear violations
store.clear()
```

### Violation Structure

```typescript
interface SandboxViolation {
  type: 'filesystem' | 'network'
  timestamp: number
  path?: string
  host?: string
  port?: number
  operation?: string
  denied: boolean
}
```

## Configuration Schemas

### NetworkConfig

```typescript
interface NetworkConfig {
  allowedDomains: string[]  // Whitelist of allowed domains
  deniedDomains: string[]   // Blacklist of denied domains
}
```

**Domain Patterns**:
- Exact match: `'example.com'`
- Wildcard subdomain: `'*.example.com'`
- Localhost: `'localhost'`, `'127.0.0.1'`
- Block all: `'*'`

### FilesystemConfig

```typescript
interface FilesystemConfig {
  allowRead?: string[]   // Paths allowed for reading
  denyRead?: string[]    // Paths denied for reading
  allowWrite?: string[]  // Paths allowed for writing
  denyWrite?: string[]   // Paths denied for writing
}
```

**Path Patterns**:
- Absolute: `'/etc/hosts'`
- Home-relative: `'~/.ssh/id_rsa'`
- Current directory: `'.'`, `'./logs'`
- Glob patterns: `'/var/log/**'`, `'~/.config/*'`

### IgnoreViolationsConfig

```typescript
interface IgnoreViolationsConfig {
  filesystem?: boolean  // Ignore filesystem violations
  network?: boolean     // Ignore network violations
}
```

## Platform-Specific Behavior

### macOS (sandbox-exec)

- Uses Apple's built-in `sandbox-exec` with Scheme-based profiles
- Real-time violation monitoring via system log
- Requires read access to `/var/db/diagnostics`
- Supports glob patterns natively

### Linux (bubblewrap)

- Uses `bubblewrap` for filesystem isolation
- Network filtering via SOCKS5 proxy
- Limited glob pattern support (warnings emitted)
- Requires `bubblewrap` package installed

## Usage Examples

### Basic Usage

```typescript
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'

// Initialize with config
await SandboxManager.initialize({
  network: {
    allowedDomains: ['anthropic.com'],
    deniedDomains: ['*']
  },
  filesystem: {
    allowRead: ['.'],
    allowWrite: ['./output']
  }
})

// Wrap command
const wrapped = await SandboxManager.wrapWithSandbox('curl https://anthropic.com')

// Execute wrapped command
const { execFile } = require('child_process')
execFile('/bin/sh', ['-c', wrapped], (error, stdout, stderr) => {
  console.log(stdout)
})

// Cleanup
await SandboxManager.reset()
```

### Violation Monitoring

```typescript
await SandboxManager.initialize(config, undefined, true)

const store = SandboxManager.getSandboxViolationStore()

// Check violations periodically
setInterval(() => {
  const violations = store.getViolations()
  if (violations.length > 0) {
    console.log('New violations detected:', violations)
    store.clear()
  }
}, 1000)
```

### Interactive Violation Handling

```typescript
await SandboxManager.initialize(
  config,
  async (violation) => {
    console.log(`Violation detected: ${violation.type}`)
    console.log(`  Path/Host: ${violation.path || violation.host}`)
    
    // Ask user for permission (simplified example)
    const allow = await promptUser(`Allow ${violation.path}?`)
    return allow
  }
)
```

## Dependencies

### Runtime Dependencies

- `@pondwader/socks5-server` - SOCKS5 proxy server
- `commander` - CLI argument parsing
- `lodash-es` - Utility functions
- `shell-quote` - Shell command parsing
- `zod` - Schema validation

### System Dependencies

**macOS**:
- `sandbox-exec` (built-in)
- `/var/db/diagnostics` (read access for violation monitoring)

**Linux**:
- `bubblewrap` package
- `ip` command (iproute2)
- `iptables` (optional, for enhanced network filtering)

## Security Considerations

### Secure by Default

- Processes start with **minimal access**
- Explicit allow-listing required
- Network blocked by default (must whitelist domains)
- Filesystem restricted to current directory

### Known Limitations

1. **Not a security boundary**: Research preview for safer AI agents
2. **Glob patterns**: Limited support on Linux
3. **Escape possibilities**: Advanced users may bypass restrictions
4. **Performance overhead**: Proxy-based network filtering adds latency

### Best Practices

1. Use specific paths over glob patterns
2. Test on target platform (macOS/Linux differences)
3. Monitor violations in production
4. Keep allowlists minimal
5. Use `denyRead`/`denyWrite` for sensitive paths

## Integration Points for TestUI

### 1. Command Wrapping

Replace direct command execution with sandboxed commands:

```typescript
// Before
const command = 'npm run test'

// After
const wrapped = await SandboxManager.wrapWithSandbox('npm run test')
```

### 2. Browser Launch

Sandbox Chrome/Puppeteer processes:

```typescript
const chromeCommand = await SandboxManager.wrapWithSandbox(
  'google-chrome --remote-debugging-port=9222'
)
```

### 3. Network Filtering

Control which domains the browser can access:

```typescript
await SandboxManager.initialize({
  network: {
    allowedDomains: ['localhost', 'test-app.com'],
    deniedDomains: ['*']
  }
})
```

### 4. Filesystem Protection

Prevent unauthorized file access:

```typescript
await SandboxManager.initialize({
  filesystem: {
    allowRead: ['.', '/tmp'],
    denyRead: ['~/.ssh', '~/.aws', '~/.env'],
    allowWrite: ['./screenshots', './logs'],
    denyWrite: ['/etc', '/usr', '/System']
  }
})
```

### 5. Violation Monitoring

Track and alert on security violations:

```typescript
const store = SandboxManager.getSandboxViolationStore()

// Check violations after test run
const violations = store.getViolations()
if (violations.length > 0) {
  console.warn('Security violations detected during test run')
  violations.forEach(v => console.warn(`  - ${v.type}: ${v.path || v.host}`))
}
```

## References

- **Source Code**: https://github.com/Zeeeepa/sandbox-runtime
- **NPM Package**: https://www.npmjs.com/package/@anthropic-ai/sandbox-runtime
- **Claude Code**: Integration example from Anthropic
- **Bubblewrap Docs**: https://github.com/containers/bubblewrap
- **macOS sandbox-exec**: `man sandbox-exec`

