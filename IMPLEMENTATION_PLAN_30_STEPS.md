# 30-Step Implementation Plan: Sandbox-Runtime Integration

**Linear Project:** [Sandbox-Runtime Integration for TestUI](https://linear.app/zambe/project/sandbox-runtime-integration-for-testui-2cfa558a3f37)

## Phase 1: Environment Setup & Foundation (Steps 1-8)

### ✅ Step 1: Setup AI-Optimized Development Environment
**Linear:** [ZAM-1184](https://linear.app/zambe/issue/ZAM-1184)
- Configure TypeScript strict mode, ESLint, Prettier
- Setup pre-commit hooks and verification script
- **Success:** `./vibe/verify.sh` passes with zero errors

### ✅ Step 2: Install sandbox-runtime from Zeeeepa/sandbox-runtime  
**Linear:** [ZAM-1185](https://linear.app/zambe/issue/ZAM-1185)
- `npm install github:Zeeeepa/sandbox-runtime`
- Verify SandboxManager import works
- **Success:** Package installed, imports functional

### ✅ Step 3: Audit sandbox-runtime API & Create Documentation
**Linear:** [ZAM-1186](https://linear.app/zambe/issue/ZAM-1186)
- Study SandboxManager methods and config schema
- Document platform differences (macOS/Linux)
- **Success:** Complete API docs created

### Step 4: Create Sandbox Configuration with Localhost Access
**XML Spec:**
```xml
<sandbox_config>
  <filesystem>
    <allowWrite>['./screenshots', './logs', '/tmp/testui-*']</allowWrite>
    <denyRead>['~/.ssh', '~/.aws', '~/.config']</denyRead>
  </filesystem>
  <network>
    <allowedDomains>['localhost', '127.0.0.1', '*.local']</allowedDomains>
    <allowLocalBinding>true</allowLocalBinding>
  </network>
  <ignoreViolations>false</ignoreViolations>
</sandbox_config>
```
**Deliverables:**
- `testdriver-proxy/sandbox-config.js`
- Default policy allowing Chrome + localhost
- **Success:** Config validates against schema

### Step 5: Create Context Management System
**XML Spec:**
```xml
<context_system>
  <required_files>
    - package.json, tsconfig.json
    - sandbox-config.js
    - testdriver-proxy/bin/testui
    - agent/lib/commands.js
  </required_files>
  <patterns>
    - Browser launch patterns
    - YAML execution patterns
    - Error handling patterns
  </patterns>
</context_system>
```
**Deliverables:**
- `.cursor/rules` with development standards
- Context loading script
- **Success:** AI can reference all patterns

### Step 6: Initialize Sandbox-Runtime at Testui Startup
**XML Spec:**
```xml
<sandbox_initialization>
  <location>testdriver-proxy/bin/testui</location>
  <code_pattern>
    const { SandboxManager } = require('@anthropic-ai/sandbox-runtime');
    const sandboxConfig = require('../sandbox-config');
    
    async function initSandbox() {
      await SandboxManager.initialize(sandboxConfig);
      console.log('✅ Sandbox initialized');
    }
  </code_pattern>
  <verification>
    - testui starts without errors
    - Sandbox policies loaded correctly
    - Platform-appropriate sandbox active (sandbox-exec or bubblewrap)
  </verification>
</sandbox_initialization>
```
**Success:** Sandbox initializes on testui start

### Step 7: Auto-Detect Chrome Binary Location
**XML Spec:**
```xml
<chrome_detection>
  <search_paths>
    - /usr/bin/google-chrome
    - /usr/bin/chromium
    - /usr/bin/chromium-browser
    - /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
    - C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe
  </search_paths>
  <fallback>Use system PATH: which chromium || which chrome</fallback>
</chrome_detection>
```
**Deliverables:**
- `lib/chrome-finder.js`
- **Success:** Chrome found on macOS and Linux

### Step 8: Create Verification Loop System
**XML Spec:**
```xml
<verification_system>
  <layer_1_technical>
    - TypeScript: npm run typecheck
    - Linting: npm run lint
    - Tests: npm test
    - Circular deps: madge --circular
  </layer_1_technical>
  <layer_2_functional>
    - Happy path: Test basic testui execution
    - Edge cases: Empty inputs, long queries
    - Error scenarios: Invalid URLs, network failures
  </layer_2_functional>
  <layer_3_architectural>
    - Human review checklist
    - Architectural decision log
  </layer_3_architectural>
</verification_system>
```
**Deliverables:**
- `.vibe/verify.sh` (Layer 1)
- `.vibe/verify-functional.md` (Layer 2 prompts)
- `.vibe/review-checklist.md` (Layer 3)
**Success:** 3-layer verification system operational

---

## Phase 2: Core Sandbox Implementation (Steps 9-18)

### Step 9: Wrap Chrome Launch with Sandbox
**XML Spec:**
```xml
<browser_sandboxing>
  <current_pattern>
    const driver = await new Builder().forBrowser('chrome').build();
  </current_pattern>
  <new_pattern>
    const chromePath = findChrome();
    const sandboxedCommand = await SandboxManager.wrapWithSandbox(chromePath);
    
    const options = new chrome.Options();
    options.setChromeBinaryPath(sandboxedCommand);
    options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
    
    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  </new_pattern>
</browser_sandboxing>
```
**Files:** `testdriver-proxy/bin/testui`, `agent/lib/commands.js`
**Success:** Browser launches in sandbox

### Step 10: Test Localhost Network Access in Sandbox
**XML Spec:**
```xml
<localhost_testing>
  <test_script>
    1. Start test app on localhost:4000
    2. Launch sandboxed browser
    3. Navigate to http://localhost:4000
    4. Verify page loads successfully
    5. Test form interactions
    6. Capture screenshot
  </test_script>
  <validation>
    - Browser can access localhost
    - Screenshots save correctly
    - No sandbox violations logged
  </validation>
</localhost_testing>
```
**Deliverable:** `test-sandbox-localhost.js`
**Success:** Localhost access works in sandbox

### Step 11: Add Screenshot Directory to Sandbox allowWrite
**XML Spec:**
```xml
<screenshot_permissions>
  <directory_setup>
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    sandboxConfig.filesystem.allowWrite.push(screenshotDir);
  </directory_setup>
</screenshot_permissions>
```
**Success:** Screenshots write successfully

### Step 12: Extract Domain from Query and Add to allowedDomains
**XML Spec:**
```xml
<dynamic_domain_allowlist>
  <parsing_logic>
    function extractDomain(query) {
      const urlMatch = query.match(/(?:on|visit|test)\\s+((?:https?:\\/\\/)?[\\w.-]+(?::\\d+)?)/i);
      if (urlMatch) {
        const domain = urlMatch[1].replace(/^https?:\\/\\//, '');
        return domain;
      }
      return null;
    }
    
    const domain = extractDomain(query);
    if (domain && !sandboxConfig.network.allowedDomains.includes(domain)) {
      sandboxConfig.network.allowedDomains.push(domain);
    }
  </parsing_logic>
</dynamic_domain_allowlist>
```
**Success:** "on localhost:8080" auto-allows localhost:8080

### Step 13: Parse Credentials from Query Safely
**XML Spec:**
```xml
<credential_parsing>
  <patterns>
    token: /token\\s+(\\S+)/i
    username: /username\\s+(\\S+)/i
    password: /password\\s+(\\S+)/i
  </patterns>
  <security>
    - NEVER log credentials to console
    - NEVER write credentials to files
    - Pass directly to LLM as variables
    - Redact from error messages
  </security>
</credential_parsing>
```
**Success:** Credentials extracted, not logged

### Step 14: Update LLM Prompt to Include Credentials in YAML
**XML Spec:**
```xml
<llm_prompt_enhancement>
  <prompt_template>
    Generate YAML for: ${sanitizedQuery}
    
    Available credentials (use when needed):
    ${credentials.token ? `- Token: ${credentials.token}` : ''}
    ${credentials.username ? `- Username: ${credentials.username}` : ''}
    ${credentials.password ? `- Password: ${credentials.password}` : ''}
    
    Incorporate these into appropriate YAML steps (login forms, auth headers, etc).
  </prompt_template>
</llm_prompt_enhancement>
```
**Files:** `testdriver-proxy/server.js`
**Success:** LLM receives credentials, generates correct YAML

### Step 15: Handle Sandbox Violations Gracefully
**XML Spec:**
```xml
<error_handling>
  <violation_detection>
    try {
      await executeSandboxedTest(query);
    } catch (error) {
      if (error.message.includes('Operation not permitted')) {
        const violations = SandboxManager.getSandboxViolationStore();
        console.error('🚫 Sandbox violation:', violations);
        console.error('Check sandbox-config.js allowWrite/allowedDomains');
      }
      throw error;
    }
  </violation_detection>
</error_handling>
```
**Success:** Clear error messages for violations

### Step 16: Add Sandbox Cleanup on Exit
**XML Spec:**
```xml
<cleanup_handlers>
  <exit_hooks>
    process.on('exit', async () => {
      await SandboxManager.reset();
    });
    
    process.on('SIGINT', async () => {
      await SandboxManager.reset();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await SandboxManager.reset();
      process.exit(0);
    });
  </exit_hooks>
</cleanup_handlers>
```
**Success:** Resources cleaned on exit

### Step 17: Verify YAML Executor Uses Sandboxed Browser
**XML Spec:**
```xml
<yaml_execution_verification>
  <check_points>
    1. All browser interactions go through sandboxed driver instance
    2. File operations (screenshots) respect sandbox filesystem rules
    3. Network requests only to allowed domains
    4. No operations escape sandbox boundary
  </check_points>
</yaml_execution_verification>
```
**Files:** `agent/lib/commands.js`
**Success:** All commands execute in sandbox

### Step 18: Test Complete Flow with Localhost App
**XML Spec:**
```xml
<integration_test>
  <test_scenario>
    1. Start test app: cd testdriver-proxy/tests/ui/test-app && node server.js
    2. Run: testui "on localhost:4000 click all buttons and verify"
    3. Verify:
       - YAML generated correctly
       - Browser launches in sandbox
       - localhost:4000 accessible
       - Commands execute successfully
       - Screenshots captured
       - Results returned
  </test_scenario>
</integration_test>
```
**Success:** Full end-to-end flow works

---

## Phase 3: Testing & Cross-Platform Validation (Steps 19-24)

### Step 19: Create Comprehensive Integration Test Suite
**XML Spec:**
```xml
<integration_tests>
  <test_cases>
    1. basic_navigation: "visit localhost:4000 and get title"
    2. form_interaction: "fill email field and click submit"
    3. credential_usage: "login with username admin password secret123"
    4. multi_step: "navigate to page, fill form, verify success"
    5. screenshot_capture: "click button, capture screenshot, verify saved"
  </test_cases>
  <validation>
    - All tests pass consistently
    - No sandbox violations
    - Screenshots generated
    - Clean error messages
  </validation>
</integration_tests>
```
**Deliverable:** `test/integration/sandbox-testui.test.js`
**Success:** All integration tests pass

### Step 20: Test Sandbox Violation Scenarios
**XML Spec:**
```xml
<violation_testing>
  <test_scenarios>
    1. Blocked file access: Try to read ~/.ssh/id_rsa
    2. Blocked network: Try to visit blocked-domain.com
    3. Blocked file write: Try to write to /etc/hosts
    4. Resource limits: Test memory/CPU constraints
  </test_scenarios>
  <expected_behavior>
    - Clear error messages
    - Violations logged to SandboxViolationStore
    - Partial results returned when possible
    - No security bypasses
  </expected_behavior>
</violation_testing>
```
**Success:** Violations handled correctly

### Step 21: Test Multi-Domain Navigation
**XML Spec:**
```xml
<multi_domain_test>
  <scenarios>
    1. "test localhost:8080 then navigate to localhost:3000"
    2. "visit example.com and follow link to example.org"
    3. "test localhost:4000 with external API calls"
  </scenarios>
  <validation>
    - All mentioned domains auto-added to allowlist
    - Navigation between domains works
    - Unexpected domains blocked with clear error
  </validation>
</multi_domain_test>
```
**Success:** Multi-domain scenarios work

### Step 22: Cross-Platform Testing - macOS
**XML Spec:**
```xml
<macos_testing>
  <environment>
    - macOS 12+ (Monterey, Ventura, Sonoma)
    - Intel and Apple Silicon
  </environment>
  <tests>
    1. Install dependencies (sandbox-exec available)
    2. Run full integration test suite
    3. Verify sandbox-exec is used (ps aux | grep sandbox)
    4. Test Chrome launch and localhost access
    5. Verify screenshots saved
  </tests>
  <platform_notes>
    - Document any macOS-specific flags
    - Note Apple Silicon considerations
  </platform_notes>
</macos_testing>
```
**Deliverable:** `docs/MACOS_TESTING.md`
**Success:** All tests pass on macOS

### Step 23: Cross-Platform Testing - Linux
**XML Spec:**
```xml
<linux_testing>
  <environment>
    - Ubuntu 20.04, 22.04
    - Debian 11+
  </environment>
  <setup>
    sudo apt install bubblewrap chromium-browser
  </setup>
  <tests>
    1. Install bubblewrap
    2. Run full integration test suite
    3. Verify bubblewrap is used (ps aux | grep bwrap)
    4. Test Chrome launch and localhost access
    5. Verify X11/Wayland compatibility
    6. Verify screenshots saved
  </tests>
</linux_testing>
```
**Deliverable:** `docs/LINUX_TESTING.md`
**Success:** All tests pass on Linux

### Step 24: Performance Benchmarking
**XML Spec:**
```xml
<performance_testing>
  <metrics>
    - Sandbox initialization time: <2s
    - Browser launch time: <3s
    - Simple test execution: <10s total
    - Complex test (10 steps): <30s total
    - Screenshot capture overhead: <500ms
  </metrics>
  <test_scenarios>
    1. Simple navigation test (baseline)
    2. Form interaction test
    3. Multi-step workflow test
    4. Parallel execution test (3 concurrent)
  </test_scenarios>
</performance_testing>
```
**Deliverable:** `test/performance/benchmark.js`
**Success:** Performance targets met

---

## Phase 4: Production Readiness & Documentation (Steps 25-30)

### Step 25: Add --verbose Debug Logging
**XML Spec:**
```xml
<verbose_mode>
  <flag>testui --verbose "query"</flag>
  <logging>
    - Sandbox initialization details
    - Each sandbox violation attempt
    - Network requests (allowed/denied)
    - File access attempts
    - YAML step execution
    - Screenshot paths
  </logging>
</verbose_mode>
```
**Success:** Verbose mode aids debugging

### Step 26: Security Hardening - Input Validation
**XML Spec:**
```xml
<security_hardening>
  <input_validation>
    - Sanitize URLs (block javascript:, file:, data: schemes)
    - Limit query length (<10KB)
    - Escape special characters
    - Validate domain formats
  </input_validation>
  <secret_protection>
    - Never log API keys or credentials
    - Redact sensitive data from screenshots
    - Clear environment variables in sandbox
  </secret_protection>
  <rate_limiting>
    - Limit to 10 executions per minute per IP
    - Cooldown after repeated failures
  </rate_limiting>
</security_hardening>
```
**Deliverable:** `SECURITY.md`
**Success:** Security audit passes

### Step 27: Performance Optimization
**XML Spec:**
```xml
<performance_optimization>
  <optimizations>
    1. Cache Chrome binary location (don't search every time)
    2. Reuse sandbox instances where safe
    3. Parallelize screenshot encoding
    4. Optimize YAML generation prompt (reduce tokens)
  </optimizations>
  <targets>
    - Overhead vs non-sandboxed: <2s
    - Memory usage: <500MB per execution
    - CPU usage: <50% average
  </targets>
</performance_optimization>
```
**Success:** Performance improved 20%+

### Step 28: Create Agent Integration Documentation
**XML Spec:**
```xml
<agent_documentation>
  <sections>
    1. Quickstart (5-minute integration)
    2. Installation & Requirements
    3. Usage Examples
    4. Error Handling Guide
    5. Best Practices
    6. Troubleshooting
  </sections>
  <code_examples>
    - Python agent example
    - Node.js agent example
    - REST API wrapper
    - Common patterns
  </code_examples>
</agent_documentation>
```
**Deliverable:** `docs/AGENT_INTEGRATION.md`
**Success:** Agent developers can integrate in 15min

### Step 29: Create Example Test Cases Library
**XML Spec:**
```xml
<example_library>
  <examples>
    1. basic-navigation.txt
    2. form-testing.txt
    3. authentication.txt
    4. crud-operations.txt
    5. multi-step-workflow.txt
    6. api-testing.txt
    7. error-handling.txt
    8. performance-testing.txt
  </examples>
  <format>
    Each example shows:
    - Natural language query
    - Expected behavior
    - Success criteria
    - Common issues
  </format>
</example_library>
```
**Deliverable:** `examples/` directory
**Success:** 8+ working examples

### Step 30: Release Preparation & CI/CD Integration
**XML Spec:**
```xml
<release_preparation>
  <version>v2.0.0-sandbox-ready</version>
  <changelog>
    - NEW: Local sandbox execution with sandbox-runtime
    - NEW: Single-command agent interface
    - NEW: Automatic credential parsing
    - NEW: Dynamic domain allowlist
    - IMPROVED: Security with filesystem/network restrictions
    - FIXED: Various performance and reliability issues
  </changelog>
  <ci_cd>
    - GitHub Actions: Run tests on push
    - Cross-platform testing: macOS + Linux
    - Security scanning: npm audit, snyk
    - Performance benchmarks: Track regressions
  </ci_cd>
  <documentation>
    - Updated README with new usage
    - Migration guide (if breaking changes)
    - Platform-specific installation guides
  </documentation>
</release_preparation>
```
**Deliverables:**
- CHANGELOG.md
- `.github/workflows/test.yml`
- Updated README.md
**Success:** Release published, CI green

---

## Success Metrics

### Overall Project Success
- ✅ Single command works: `testui "on localhost:8080 test everything using token xxx username yyy password zzz"`
- ✅ All 30 steps completed with verification
- ✅ Integration tests pass on macOS and Linux
- ✅ Performance targets met (<10s simple tests)
- ✅ Security audit passes (no vulnerabilities)
- ✅ Documentation complete and clear
- ✅ Agent developers can integrate in <15 minutes

### Quality Gates
- **Code Quality:** 100% TypeScript strict mode, zero ESLint warnings
- **Test Coverage:** >80% for core sandbox integration code
- **Performance:** <10s for simple tests, <30s for complex
- **Security:** Zero high/critical vulnerabilities
- **Documentation:** All APIs documented with examples

---

## Next Steps

1. **Review this plan** - Approve or request changes
2. **I'll create remaining Linear tasks** - Steps 4-30
3. **Begin implementation** - Start with Phase 1
4. **Verification loops** - Run after each step
5. **Iterate until perfect** - Fix issues immediately

Ready to proceed? 🚀

