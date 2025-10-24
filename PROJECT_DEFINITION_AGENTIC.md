# 🤖 Sandbox-Runtime Integration: Fully Agentic TestUI

## 🎯 Mission Statement
Transform TestUI into a production-ready, AI agent-controlled browser testing tool using local sandbox execution with **ONE COMMAND** interface for autonomous testing.

**PRIMARY GOAL:**
```bash
testui "on localhost:8080 test all UI features using token abc123 username admin password secret"
```

---

## 📋 Complete Project Definition

### Problem Statement
Current TestUI implementation uses a **remote sandbox**, which prevents AI agents from testing applications running on localhost. This creates a significant limitation for autonomous agent workflows that need to:
- Test local development servers
- Validate UI changes before deployment
- Execute end-to-end test scenarios
- Perform security testing on internal applications

### Solution Architecture
Integrate `@Zeeeepa/sandbox-runtime` to enable:
1. **Local Sandboxed Execution:** Browser runs with filesystem and network restrictions
2. **Natural Language Interface:** Parse domains and credentials from plain English
3. **Single-Command Testing:** Agents execute complex test flows with one command
4. **Security Boundaries:** Prevent unauthorized file/network access
5. **Cross-Platform Support:** Works on macOS (sandbox-exec) and Linux (bubblewrap)

### Success Criteria
✅ **Primary Goal:** `testui` command works with localhost URLs
✅ **Agent Autonomy:** AI agents execute tests without human intervention
✅ **Security:** Full sandbox enforcement (no escapes)
✅ **Performance:** <10s for simple tests, <30s for complex workflows
✅ **Reliability:** >95% success rate on standard test scenarios
✅ **Cross-Platform:** Passes all tests on macOS and Linux

---

## 🔗 Project URLs & Resources

### Primary Resources
- **GitHub Repository:** https://github.com/Zeeeepa/cli
- **Sandbox Library:** https://github.com/Zeeeepa/sandbox-runtime
- **Linear Project:** https://linear.app/zambe/project/sandbox-runtime-integration-for-testui-2cfa558a3f37
- **Task Range:** ZAM-1184 through ZAM-1213 (30 tasks total)

### Documentation (To Be Created)
- `docs/SANDBOX_INTEGRATION.md` - Integration guide
- `docs/AGENT_INTEGRATION.md` - AI agent usage guide
- `docs/MACOS_TESTING.md` - Platform-specific notes
- `docs/LINUX_TESTING.md` - Platform-specific notes
- `SECURITY.md` - Security model and policies

### Testing Resources
- Test Application: `testdriver-proxy/tests/ui/test-app/`
- Integration Tests: `test/integration/`
- Performance Benchmarks: `test/performance/`

---

## 🤖 AI Agent Configuration

### Required Environment Variables

```bash
# Z.ai Anthropic-Compatible Endpoint Configuration
export ANTHROPIC_API_URL="https://api.z.ai/v1"
export ANTHROPIC_API_KEY="your-z-ai-api-key-here"
export ANTHROPIC_MODEL="glm-4.5v"

# TestUI Sandbox Configuration
export TESTUI_SANDBOX_ENABLED=true
export TESTUI_VERBOSE=false
export TESTUI_SCREENSHOT_DIR="./screenshots"
export TESTUI_LOGS_DIR="./logs"

# Platform Detection (auto-detected, can override)
export TESTUI_SANDBOX_PLATFORM="auto"  # auto|macos|linux

# Performance Tuning
export TESTUI_TIMEOUT=30000  # 30 second default timeout
export TESTUI_MAX_RETRIES=3
```

### Agent Capabilities Matrix

| Capability | Required | Purpose |
|------------|----------|---------|
| File Read/Write | ✅ Yes | Modify source code, create configs |
| Shell Execution | ✅ Yes | Run npm commands, validation scripts |
| Git Operations | ✅ Yes | Commit changes, create branches |
| Network Access | ✅ Yes | Install packages, test localhost |
| XML Parsing | ✅ Yes | Understand task specifications |
| Test Execution | ✅ Yes | Run validation loops |

### LLM Model Requirements
- **Recommended:** GLM-4.5V (via Z.ai)
- **Minimum Context:** 8K tokens
- **Required Capabilities:** 
  - Code generation
  - Shell command execution
  - YAML generation
  - Error analysis and debugging

---

## ✅ Validation & Testing Framework

### ONE-COMMAND TEST SUITE
The entire project can be validated with:
```bash
npm run test:agentic
```

This executes all 4 validation layers:

#### Layer 1: Static Analysis (Automated)
```bash
npm run typecheck  # TypeScript validation
npm run lint       # ESLint checks
npm test          # Unit tests
madge --circular  # Dependency cycle detection
```
**Exit Criteria:** All checks pass with zero errors

#### Layer 2: Integration Testing (Automated)
```bash
npm run test:integration
```
Tests:
- Basic navigation to localhost
- Form interaction and submission
- Credential usage in authentication
- Multi-step workflows
- Screenshot capture functionality

**Exit Criteria:** All integration tests pass (>95% success rate)

#### Layer 3: End-to-End Validation (Semi-Automated)
```bash
npm run test:e2e
```
Tests complete user workflows:
1. Start test application on localhost:4000
2. Execute `testui` with natural language query
3. Verify YAML generation
4. Confirm browser launches in sandbox
5. Validate all commands execute
6. Check screenshots captured
7. Verify results returned correctly

**Exit Criteria:** Full workflow completes successfully

#### Layer 4: Cross-Platform Validation (Manual)
- Test on macOS (Intel + Apple Silicon)
- Test on Linux (Ubuntu 20.04, 22.04, Debian 11+)
- Verify platform-specific sandbox mechanisms
- Confirm no platform-specific bugs

**Exit Criteria:** Tests pass on all target platforms

### Per-Task Validation Scripts
Each of the 30 tasks includes a validation script:
```bash
.vibe/verify-step-1.sh   # Validates Step 1 completion
.vibe/verify-step-2.sh   # Validates Step 2 completion
# ... through step 30
```

**Script Behavior:**
- **Exit 0:** Task complete and validated ✅
- **Exit 1:** Task failed with actionable error message ❌

**Error Output Format:**
```
❌ Step N Validation Failed

Error: [Specific issue detected]

Fix Required:
- [Actionable step 1]
- [Actionable step 2]

Validation Command:
.vibe/verify-step-N.sh
```

---

## 📊 Implementation Phases & Task Breakdown

### Phase 1: Environment Setup & Foundation (Steps 1-8)
**Milestone:** Phase 1: Environment Setup & Foundation
**Duration Estimate:** 2-4 hours agent time

#### Tasks:
1. **ZAM-1184:** Setup AI-Optimized Dev Environment
   - Configure TypeScript strict mode
   - Setup ESLint, Prettier
   - Create verification scripts
   - **Validation:** `.vibe/verify-step-1.sh`

2. **ZAM-1185:** Install sandbox-runtime
   - Add GitHub dependency to package.json
   - Verify import works
   - Check platform dependencies
   - **Validation:** `.vibe/verify-step-2.sh`

3. **ZAM-1186:** Audit sandbox-runtime API
   - Study SandboxManager methods
   - Document config schema
   - Note platform differences
   - **Validation:** docs/SANDBOX_API.md exists

4. **ZAM-1187:** Create Sandbox Configuration
   - Define filesystem policies
   - Configure network allowlist
   - Set localhost access
   - **Validation:** Config validates against schema

5. **ZAM-1188:** Create Context Management System
   - Setup `.cursor/rules`
   - Document patterns
   - Create context loader
   - **Validation:** AI can load all context

6. **ZAM-1189:** Initialize Sandbox at Startup
   - Add init code to testui binary
   - Load config
   - Verify platform detection
   - **Validation:** testui starts without errors

7. **ZAM-1190:** Auto-Detect Chrome Binary
   - Implement chrome-finder.js
   - Check common paths
   - Fallback to PATH
   - **Validation:** Chrome found on test systems

8. **ZAM-1191:** Create 3-Layer Verification System
   - Build verify.sh (Layer 1)
   - Document functional tests (Layer 2)
   - Create review checklist (Layer 3)
   - **Validation:** npm run verify passes

### Phase 2: Core Sandbox Implementation (Steps 9-18)
**Milestone:** Phase 2: Core Sandbox Implementation
**Duration Estimate:** 4-8 hours agent time

#### Tasks:
9. **ZAM-1192:** Wrap Chrome Launch with Sandbox
10. **ZAM-1193:** Test Localhost Network Access
11. **ZAM-1194:** Add Screenshot Directory Permissions
12. **ZAM-1195:** Extract Domain from Query
13. **ZAM-1196:** Parse Credentials Safely
14. **ZAM-1197:** Update LLM Prompt for Credentials
15. **ZAM-1198:** Handle Sandbox Violations Gracefully
16. **ZAM-1199:** Add Sandbox Cleanup on Exit
17. **ZAM-1200:** Verify YAML Executor Uses Sandbox
18. **ZAM-1201:** Test Complete E2E Flow

### Phase 3: Testing & Cross-Platform Validation (Steps 19-24)
**Milestone:** Phase 3: Testing & Cross-Platform Validation
**Duration Estimate:** 3-6 hours agent time

#### Tasks:
19. **ZAM-1202:** Create Integration Test Suite
20. **ZAM-1203:** Test Sandbox Violation Scenarios
21. **ZAM-1204:** Test Multi-Domain Navigation
22. **ZAM-1205:** Cross-Platform Testing - macOS
23. **ZAM-1206:** Cross-Platform Testing - Linux
24. **ZAM-1207:** Performance Benchmarking

### Phase 4: Production Readiness & Documentation (Steps 25-30)
**Milestone:** Phase 4: Production Readiness & Documentation
**Duration Estimate:** 2-4 hours agent time

#### Tasks:
25. **ZAM-1208:** Add --verbose Debug Logging
26. **ZAM-1209:** Security Hardening
27. **ZAM-1210:** Performance Optimization
28. **ZAM-1211:** Create Agent Documentation
29. **ZAM-1212:** Create Example Test Cases
30. **ZAM-1213:** Release Preparation & CI/CD

---

## 🎯 AI Agent Execution Model

### Autonomous Execution Mode

**Step-by-Step Process:**
1. **Task Discovery**
   ```bash
   # Agent queries Linear for next task
   linear_get_issue(issue_id="ZAM-1184")
   ```

2. **Specification Loading**
   - Parse XML specification from task description
   - Extract deliverables, verification criteria
   - Identify dependencies on previous tasks

3. **Implementation**
   - Follow XML specification exactly
   - Write code following existing patterns
   - Add comments for complex logic
   - Create validation script if needed

4. **Validation Execution**
   ```bash
   # Run task-specific validation
   .vibe/verify-step-N.sh
   
   # Check exit code
   if [ $? -eq 0 ]; then
     echo "✅ Task complete"
     # Mark task complete in Linear
     linear_update_issue(state="Done")
     # Proceed to next task
   else
     echo "❌ Task failed"
     # Analyze error
     # Iterate on fix
     # Re-validate
   fi
   ```

5. **Iteration Loop**
   - If validation fails, analyze error message
   - Make targeted fix
   - Re-run validation
   - Repeat until validation passes
   - **Maximum 5 iterations** before requesting human help

6. **Progress to Next Task**
   - Mark current task complete
   - Load next task (ZAM-XXXX+1)
   - Repeat process

### Supervised Execution Mode

**Human-in-the-Loop Workflow:**
1. Agent implements task following spec
2. Agent runs validation and reports results
3. **Human reviews** code changes
4. **Human approves** or requests changes
5. If approved, agent marks complete and proceeds
6. If changes requested, agent iterates

### Error Recovery Protocol

**When Validation Fails:**
1. Read error message carefully
2. Check recent code changes
3. Review task XML specification
4. Search codebase for similar patterns
5. Make targeted fix (avoid overengineering)
6. Re-run validation
7. If still failing after 3 attempts:
   - Document the issue
   - Request human assistance
   - Provide error logs and attempted fixes

**Common Error Types:**
- **Import Error:** Missing npm install or incorrect path
- **Syntax Error:** TypeScript validation failed
- **Test Failure:** Logic bug in implementation
- **Sandbox Violation:** Incorrect policy configuration
- **Performance:** Operation exceeds timeout

---

## 🛠️ Technical Stack Details

### Core Dependencies
```json
{
  "dependencies": {
    "@anthropic-ai/sandbox-runtime": "github:Zeeeepa/sandbox-runtime",
    "selenium-webdriver": "^4.x",
    "yaml": "^2.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "eslint": "^8.x",
    "prettier": "^3.x",
    "jest": "^29.x"
  }
}
```

### Platform-Specific Requirements

**macOS:**
- sandbox-exec (built-in)
- Chrome or Chromium browser
- Node.js 18+
- Xcode Command Line Tools

**Linux:**
- bubblewrap (`sudo apt install bubblewrap`)
- chromium-browser (`sudo apt install chromium-browser`)
- Node.js 18+
- Build essentials

### LLM Integration
- **Provider:** Z.ai (Anthropic-compatible API)
- **Model:** GLM-4.5V
- **Purpose:** Generate YAML test workflows from natural language
- **Input:** Natural language query + credentials (if provided)
- **Output:** Executable YAML test steps

### Browser Automation
- **Driver:** Selenium WebDriver
- **Browser:** Chrome/Chromium (headless mode)
- **Sandbox:** Wrapped by sandbox-runtime
- **Capabilities:** Navigation, form interaction, screenshots

---

## 🚀 Quick Start for AI Agents

### Initial Setup (5 minutes)
```bash
# 1. Clone repository
git clone https://github.com/Zeeeepa/cli.git
cd cli

# 2. Install dependencies
npm install

# 3. Install sandbox-runtime from fork
npm install github:Zeeeepa/sandbox-runtime

# 4. Configure environment
cat > .env << EOF
ANTHROPIC_API_URL=https://api.z.ai/v1
ANTHROPIC_API_KEY=your-key-here
ANTHROPIC_MODEL=glm-4.5v
TESTUI_SANDBOX_ENABLED=true
EOF

# 5. Validate setup
npm run verify

# 6. Start implementing tasks
# Begin with ZAM-1184
```

### Development Workflow
```bash
# For each task (ZAM-XXXX):

# 1. Read task specification
linear_get_issue(issue_id="ZAM-XXXX")

# 2. Implement following XML spec
# ... make code changes ...

# 3. Run validation
.vibe/verify-step-N.sh

# 4. If pass, commit and mark complete
git add .
git commit -m "Complete ZAM-XXXX: [task title]"
linear_update_issue(state="Done")

# 5. Proceed to next task
```

### Testing Workflow
```bash
# Layer 1: Static analysis
npm run typecheck
npm run lint
npm test

# Layer 2: Integration tests
npm run test:integration

# Layer 3: E2E validation
npm run test:e2e

# Layer 4: Manual platform testing
# (Run on macOS and Linux systems)

# Complete validation
npm run test:agentic  # Runs all layers
```

---

## 📈 Progress Tracking & Metrics

### Linear Board Structure
- **View:** https://linear.app/zambe/project/sandbox-runtime-integration-for-testui-2cfa558a3f37
- **Milestones:** 4 (one per phase)
- **Tasks:** 30 (ZAM-1184 through ZAM-1213)
- **Status:** Backlog → In Progress → Done

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Task Completion Rate | 100% | 30/30 tasks done |
| Validation Pass Rate | >95% | Automated test results |
| Performance (Simple) | <10s | Benchmark suite |
| Performance (Complex) | <30s | Benchmark suite |
| Cross-Platform | 100% | Tests pass on both platforms |
| Security | 0 violations | Manual audit |

### Time Estimates
- **Fast Track (Optimal):** 12-16 hours total agent execution time
- **Nominal:** 16-24 hours total agent execution time
- **Conservative:** 24-36 hours with iteration and debugging
- **Human Review:** +4-8 hours for supervised mode

---

## 🤝 Contributing & Review

### For AI Agents
- Execute tasks autonomously following XML specs
- Run validation scripts before marking complete
- Document any ambiguities or blockers
- Request human help after 3 failed validation attempts

### For Human Developers
1. **Review agent-generated code** for:
   - Correctness and logic
   - Code quality and patterns
   - Security considerations
   - Performance implications

2. **Validate test results:**
   - Run validation scripts manually
   - Test on local development environment
   - Verify cross-platform compatibility

3. **Approve releases:**
   - Final security review
   - Performance validation
   - Documentation completeness

4. **Provide feedback:**
   - Update task specifications if unclear
   - Improve validation scripts
   - Add missing context or patterns

---

## 📞 Support & Resources

### When Stuck
1. **Review task XML spec** - All requirements defined there
2. **Check validation script** - `.vibe/verify-step-N.sh` shows expected behavior
3. **Search codebase** - Look for similar patterns
4. **Check sandbox docs** - https://github.com/Zeeeepa/sandbox-runtime
5. **Ask for help** - Create Linear comment on task

### Common Issues & Solutions

**Issue:** "Cannot find module '@anthropic-ai/sandbox-runtime'"
**Solution:** Run `npm install github:Zeeeepa/sandbox-runtime`

**Issue:** "sandbox-exec: command not found (macOS)"
**Solution:** sandbox-exec is built-in, check macOS version (12+)

**Issue:** "bwrap: command not found (Linux)"
**Solution:** `sudo apt install bubblewrap`

**Issue:** "Chrome binary not found"
**Solution:** Install Chrome/Chromium, or set CHROME_BIN env var

**Issue:** "Sandbox violation: Operation not permitted"
**Solution:** Add path/domain to sandbox-config.js allowWrite/allowedDomains

### Reference Documentation
- **Sandbox Runtime API:** See task ZAM-1186 output (docs/SANDBOX_API.md)
- **TestUI Architecture:** See existing codebase structure
- **YAML Format:** See testdriver-proxy/README.md
- **Agent Integration:** See task ZAM-1211 output (docs/AGENT_INTEGRATION.md)

---

## 🎉 Project Completion Checklist

When all 30 tasks are complete:
- [ ] All validation scripts pass
- [ ] Integration tests >95% success rate
- [ ] E2E flow works end-to-end
- [ ] Tests pass on macOS
- [ ] Tests pass on Linux
- [ ] Performance benchmarks meet targets
- [ ] Security audit completed
- [ ] Documentation complete
- [ ] CI/CD pipeline configured
- [ ] Release tagged and published

---

**Built for autonomous AI agent execution from start to finish** 🤖🚀

**Last Updated:** 2025-10-24  
**Version:** 1.0.0  
**Status:** Ready for Agent Execution

