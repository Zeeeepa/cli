# Migration Plan: Current → Sandbox-Integrated TestUI

## Executive Summary

This document outlines the migration path from the current TestDriver.ai-based TestUI to a sandbox-integrated, YAML-driven execution model with enhanced security and flexibility.

**Timeline**: 60-74 hours of development effort across 3 phases
**Risk Level**: Medium (gradual migration reduces risk)
**Breaking Changes**: Phase 3 only (TEST= file format change)

---

## Current State vs Target State

### Current Architecture

```
User CLI
    ↓
bin/testui (argument parsing)
    ↓
Test App (port 4000) + Proxy Server (port 9876)
    ↓
TestDriver.ai (via npx)
    ↓
Z.ai API (via proxy)
    ↓
Selenium Browser → Test App
```

**Characteristics**:
- ✅ Simple CLI interface
- ✅ Natural language prompts
- ❌ No credential management
- ❌ No network isolation
- ❌ Black box execution (no visibility)
- ❌ Dependent on TestDriver.ai

### Target Architecture

```
User CLI (with credentials)
    ↓
bin/testui (enhanced parsing)
    ↓
Z.ai API (direct) → YAML Generation
    ↓
YAML Validator
    ↓
Sandbox Runtime (network isolated)
    ↓
Chrome (CDP port 9222)
    ↓
YAML Executor (Puppeteer) → Test App (localhost:8080)
    ↓
Artifacts (screenshots, logs)
```

**Characteristics**:
- ✅ Enhanced credential support
- ✅ Network isolation (localhost only)
- ✅ Transparent execution (YAML visible)
- ✅ Artifact collection
- ✅ No external dependencies
- ✅ Configurable security policies

---

## Migration Phases

## Phase 1: Foundation (Weeks 1-2)

### Objectives
- Document current architecture ✅ DONE
- Audit sandbox-runtime API
- Design YAML schema v1
- Create LLM prompts for YAML generation
- Build Chrome sandbox PoC

### Deliverables
1. **Documentation** ✅ Complete
   - `docs/architecture/current-testui-flow.md`
   - `docs/architecture/current-data-flow.mmd`
   - `docs/architecture/integration-points.md`
   - `docs/architecture/dependencies.json`
   - `docs/architecture/migration-plan.md`

2. **Sandbox-Runtime Integration** ⏳ Next
   - `docs/sandbox-runtime/api-reference.md`
   - `docs/sandbox-runtime/chrome-integration.md`
   - `docs/sandbox-runtime/network-policies.md`
   - `scripts/test-sandbox-chrome.js` (working PoC)

3. **YAML Schema** ⏳ Next
   - `schemas/yaml-actions-v1.json` (JSON Schema)
   - `docs/yaml-schema/v1-spec.md`
   - `examples/yaml-flows/login-flow.yaml` (5+ examples)

4. **LLM Prompts** ⏳ Next
   - `prompts/system-prompt.txt`
   - `prompts/few-shot-examples.json` (15+ examples)
   - `lib/prompt-engine.js` (LLM integration)

5. **Chrome Sandbox PoC** ⏳ Next
   - `poc/test-server.js` (Express on port 8080)
   - `poc/test-network-isolation.js` (validates blocking)
   - `poc/test-browser-automation.js` (validates Puppeteer)
   - `poc/run-all-tests.sh` (automated validation)

### Success Criteria
- ✅ All Phase 1 documentation complete
- ✅ Sandbox-runtime spawns Chrome successfully
- ✅ Chrome restricted to localhost:8080 only
- ✅ External domains blocked (google.com, etc.)
- ✅ YAML schema validates 5+ example files
- ✅ LLM generates valid YAML >90% of the time

### Backward Compatibility
- ✅ **100% compatible** - No changes to bin/testui yet
- ✅ Existing functionality preserved
- ✅ All existing tests pass

---

## Phase 2: Parallel Implementation (Weeks 3-4)

### Objectives
- Build YAML executor with Puppeteer
- Create sandbox wrapper module
- Integrate LLM YAML generation
- Add credential parsing to CLI
- Implement PROMPT= mode with new flow

### Deliverables
1. **YAML Executor** ⏳ Next
   - `lib/yaml-executor.js` (core executor class)
   - `lib/sandbox-yaml-executor.js` (sandbox wrapper)
   - `tests/yaml-executor.test.js` (15+ tests)
   - `examples/run-yaml-executor.js` (usage example)

2. **Credential Flow** ⏳ Next
   - Enhanced `parseArgs()` in `bin/testui`
   - Support USERNAME=, PASSWORD=, TOKEN= args
   - Support TEST_USERNAME, TEST_PASSWORD env vars
   - Credential injection in YAML executor

3. **CLI Integration** ⏳ Next
   - Add YAML generation before execution (PROMPT mode)
   - Add sandbox spawning logic
   - Add artifact collection
   - Preserve TEST= mode using TestDriver.ai (temporary)

### Code Changes

#### `bin/testui` modifications
```javascript
// NEW: Enhanced argument parsing
function parseArgs() {
  // ... existing code ...
  
  // Add credential parsing
  parsed.credentials = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('USERNAME=')) 
      parsed.credentials.USERNAME = args[i].split('=')[1];
    // ... TOKEN, PASSWORD ...
  }
  
  // Check environment variables
  if (process.env.TEST_USERNAME) 
    parsed.credentials.USERNAME = process.env.TEST_USERNAME;
  
  return parsed;
}

// NEW: YAML generation for PROMPT mode
if (options.prompt) {
  const { generateYAML } = require('../lib/prompt-engine');
  const yamlContent = await generateYAML(options.prompt, {
    model: 'glm-4.5',
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  // Validate YAML
  const { validateYAML } = require('../lib/yaml-validator');
  if (!validateYAML(yamlContent).valid) {
    log('red', '❌ Invalid YAML generated');
    process.exit(1);
  }
  
  options.generatedYAML = yamlContent;
}

// NEW: Sandbox execution for PROMPT mode
if (options.prompt && options.generatedYAML) {
  const { executeYAMLInSandbox } = require('../lib/sandbox-yaml-executor');
  const results = await executeYAMLInSandbox(
    options.generatedYAML,
    options.credentials,
    sandboxConfig
  );
  
  // Display results
  log('green', `✅ ${results.actions.length} actions executed`);
  process.exit(results.errors.length > 0 ? 1 : 0);
}

// PRESERVED: TEST mode still uses TestDriver.ai (backward compatible)
if (options.testFile) {
  const testDriver = spawn('npx', ['testdriverai', 'run', ...]);
  // ... existing TestDriver.ai flow ...
}
```

#### `package.json` additions
```json
{
  "dependencies": {
    "js-yaml": "^4.1.0",
    "ajv": "^8.12.0",
    "puppeteer-core": "^21.0.0",
    "node-fetch": "^3.3.0",
    "@zeeeepa/sandbox-runtime": "latest"
  }
}
```

### Success Criteria
- ✅ PROMPT mode generates YAML and executes in sandbox
- ✅ Credentials injected correctly (${USERNAME} replaced)
- ✅ Network isolation working (localhost:8080 only)
- ✅ Artifacts saved (screenshots, logs)
- ✅ TEST mode still works with TestDriver.ai
- ✅ All 7 YAML actions implemented and tested
- ✅ >90% test success rate with LLM YAML generation

### Backward Compatibility
- ✅ **TEST= mode unchanged** - Still uses TestDriver.ai
- ⚠️ **PROMPT= mode enhanced** - Now uses sandbox (visible change)
- ✅ Old PROMPT= syntax still works (no credentials)
- ✅ New credential args are optional

---

## Phase 3: Complete Cutover (Week 5)

### Objectives
- Replace TestDriver.ai completely
- Remove proxy server
- Convert existing TEST= YAML files to new format
- Deprecate old flow

### Deliverables
1. **TEST= Mode Migration**
   - `lib/testdriver-compatibility.js` (converter)
   - `scripts/migrate-test-files.sh` (bulk conversion)
   - Migration guide documentation

2. **Proxy Server Removal**
   - Remove `server.js` (33KB freed)
   - Remove port 9876 dependency
   - Remove express, cors, morgan, etc. (simplified)

3. **Documentation Updates**
   - Updated README.md
   - Migration guide for existing users
   - New examples using credentials

### Breaking Changes

#### TEST= File Format Change
```yaml
# OLD FORMAT (TestDriver.ai)
steps:
  - action: click
    selector: "#login-button"
  - action: type
    selector: "input[name='username']"
    value: "admin"

# NEW FORMAT (Sandbox YAML v1)
metadata:
  version: "1.0"
  credentials: [USERNAME, PASSWORD]
actions:
  - action: click
    selector: "#login-button"
  - action: type
    selector: "input[name='username']"
    text: "${USERNAME}"
```

#### Migration Script
```bash
# Automated migration
./scripts/migrate-test-files.sh tests/**/*.yaml

# Manual review required
git diff tests/

# Commit migrated files
git add tests/ && git commit -m "Migrate TEST files to new format"
```

### Success Criteria
- ✅ TEST= mode uses YAML executor (no TestDriver.ai)
- ✅ Proxy server removed from architecture
- ✅ All existing test files migrated
- ✅ Documentation updated
- ✅ Performance same or better than before
- ✅ Security enhanced (network isolation)

### Backward Compatibility
- ❌ **BREAKING**: Old TEST= YAML files no longer work
- ✅ **Migration tool** provided for conversion
- ⚠️ Users must run migration script
- ✅ PROMPT= mode maintains same CLI interface

---

## Comparison Matrix

| Feature | Current | Phase 1 | Phase 2 | Phase 3 |
|---------|---------|---------|---------|---------|
| **CLI Syntax** | PROMPT=, TEST=, APP= | Same | Enhanced (credentials) | Same |
| **Natural Language** | ✅ Via TestDriver.ai | ✅ Preserved | ✅ Enhanced (YAML visible) | ✅ Enhanced |
| **YAML Execution** | ❌ | ❌ | ✅ PROMPT mode only | ✅ All modes |
| **Credential Support** | ❌ | ❌ | ✅ USERNAME, PASSWORD, TOKEN | ✅ Full support |
| **Network Isolation** | ❌ | PoC only | ✅ PROMPT mode | ✅ All modes |
| **Artifact Collection** | ❌ | ❌ | ✅ Screenshots, logs | ✅ Full support |
| **TestDriver.ai** | Required | Required | TEST mode only | ❌ Removed |
| **Proxy Server** | Required | Required | Required | ❌ Removed |
| **Breaking Changes** | N/A | None | None | TEST file format |

---

## What Stays the Same

### User Experience
- ✅ CLI command structure: `testui PROMPT="..."`
- ✅ Environment variables: `ANTHROPIC_API_KEY`
- ✅ Exit codes: 0=success, 1=failure
- ✅ Colorized output format
- ✅ Natural language test descriptions
- ✅ APP= parameter for external URLs

### Technical Infrastructure
- ✅ Node.js runtime (>=16.0.0)
- ✅ Chrome/Chromium requirement
- ✅ Z.ai API integration
- ✅ Test app server (port 4000 default)

---

## What Gets Replaced

### Removed Components
- ❌ TestDriver.ai (npx testdriverai)
- ❌ Proxy server (server.js on port 9876)
- ❌ Selenium WebDriver
- ❌ 10+ proxy server dependencies

### New Components
- ✅ Sandbox-runtime (network isolation)
- ✅ Puppeteer (CDP-based automation)
- ✅ YAML executor (transparent execution)
- ✅ LLM prompt engine (YAML generation)
- ✅ Credential injection system

---

## What Gets Added

### New Features
- ✅ Credential management (USERNAME, PASSWORD, TOKEN)
- ✅ Network isolation (localhost-only access)
- ✅ Artifact collection (screenshots, logs, recordings)
- ✅ YAML visibility (debug generated test plans)
- ✅ Schema validation (catch errors early)
- ✅ Filesystem isolation (limited Chrome access)

### New Documentation
- ✅ Architecture documentation
- ✅ YAML schema specification
- ✅ Sandbox configuration guide
- ✅ Credential best practices
- ✅ Migration guide
- ✅ Troubleshooting guide

---

## Risk Assessment

### High Risk Items
1. **Sandbox-runtime reliability** ⚠️
   - Mitigation: Extensive PoC testing in Phase 1
   - Fallback: Keep TestDriver.ai as option

2. **LLM YAML generation accuracy** ⚠️
   - Mitigation: >90% success rate required
   - Fallback: Allow manual YAML editing

3. **Chrome spawning across platforms** ⚠️
   - Mitigation: Test on Ubuntu, macOS, Windows
   - Fallback: Document platform-specific setup

### Medium Risk Items
1. **TEST= file migration** ⚠️
   - Mitigation: Automated migration script
   - Fallback: Support both formats temporarily

2. **Performance degradation** ⚠️
   - Mitigation: Benchmark before/after
   - Fallback: Optimize critical paths

### Low Risk Items
1. **Credential parsing** ✅
   - Simple string parsing, well-tested

2. **Documentation completeness** ✅
   - Extensive docs already created

---

## Success Metrics

### Phase 1
- ✅ 100% documentation coverage
- ✅ Sandbox PoC passes all tests
- ✅ YAML schema validates 5+ examples
- ✅ LLM generates valid YAML >90% rate

### Phase 2
- ✅ PROMPT= mode 100% functional with sandbox
- ✅ All 7 YAML actions working
- ✅ Credential injection tested
- ✅ Network isolation validated
- ✅ TEST= mode backward compatible

### Phase 3
- ✅ TestDriver.ai fully removed
- ✅ Proxy server removed
- ✅ All test files migrated
- ✅ Performance same or better
- ✅ Zero regressions in functionality

---

## Rollback Strategy

### Per-Phase Rollback
- **Phase 1**: No code changes → No rollback needed
- **Phase 2**: Git revert + npm install → Restore old flow
- **Phase 3**: Git revert + restore TEST files → TestDriver.ai back

### Emergency Rollback
```bash
# Revert to previous version
git revert HEAD~N  # N = commits since last stable

# Restore dependencies
npm install

# Validate
npm test
testui PROMPT="smoke test"

# Document issue
echo "Rollback reason: ..." >> ROLLBACK.md
```

---

## Timeline Estimate

### Phase 1: Foundation (16-20 hours)
- Documentation: 6-8 hours ✅ DONE
- Sandbox audit: 8-10 hours ⏳ NEXT
- YAML schema: 6-8 hours
- LLM prompts: 8-10 hours
- Chrome PoC: 8-10 hours

### Phase 2: Implementation (28-36 hours)
- YAML executor: 14-18 hours
- Sandbox wrapper: 6-8 hours
- CLI integration: 4-6 hours
- Testing & validation: 4-6 hours

### Phase 3: Cutover (16-18 hours)
- TEST= migration: 6-8 hours
- Proxy removal: 4-6 hours
- Documentation: 4-6 hours
- Final testing: 2-4 hours

**Total: 60-74 hours of development effort**

---

## Next Steps

1. ✅ Complete Phase 1 documentation (DONE)
2. ⏳ Audit sandbox-runtime API (NEXT)
3. ⏳ Design YAML schema v1
4. ⏳ Create LLM prompts
5. ⏳ Build Chrome sandbox PoC
6. ⏳ Validate Phase 1 success criteria
7. ⏳ Begin Phase 2 implementation

**Current Status**: Phase 1.1 complete, starting Phase 1.2...

