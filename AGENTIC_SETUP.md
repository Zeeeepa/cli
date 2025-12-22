# 🤖 Agentic TestUI Setup Guide

## Quick Start for AI Agents

This guide enables AI agents to autonomously implement sandbox-runtime integration.

### 1. Environment Setup (1 minute)

```bash
# Clone and enter repository
cd /path/to/cli

# Copy environment template
cp .env.example .env

# Configure Z.ai credentials
export ANTHROPIC_API_URL="https://api.z.ai/v1"
export ANTHROPIC_API_KEY="your-key-here"
export ANTHROPIC_MODEL="glm-4.5v"
```

### 2. Install Dependencies (2 minutes)

```bash
# Install project dependencies
npm install

# Install sandbox-runtime from GitHub
npm install github:Zeeeepa/sandbox-runtime

# Verify installation
npm run verify
```

### 3. Project Overview

**Objective:** Enable `testui` command to test localhost applications using local sandbox

**Target Command:**
```bash
testui "on localhost:8080 test all UI features using token abc123 username admin password secret"
```

### 4. Implementation Phases

| Phase | Tasks | Duration |
|-------|-------|----------|
| Phase 1: Foundation | ZAM-1184 to ZAM-1191 (8 tasks) | 2-4 hours |
| Phase 2: Core Implementation | ZAM-1192 to ZAM-1201 (10 tasks) | 4-8 hours |
| Phase 3: Testing & Validation | ZAM-1202 to ZAM-1207 (6 tasks) | 3-6 hours |
| Phase 4: Production Ready | ZAM-1208 to ZAM-1213 (6 tasks) | 2-4 hours |
| **Total** | **30 tasks** | **12-24 hours** |

### 5. Task Execution Loop

For each task (ZAM-XXXX):

```python
# 1. Fetch task from Linear
task = linear_get_issue("ZAM-XXXX")

# 2. Parse XML specification from task description
spec = parse_xml(task.description)

# 3. Implement following specification
implement(spec)

# 4. Run validation script
result = run_command(f".vibe/verify-step-{N}.sh")

# 5. Handle result
if result.exit_code == 0:
    # Success - mark complete and proceed
    linear_update_issue("ZAM-XXXX", state="Done")
    proceed_to_next_task()
else:
    # Failure - iterate and fix
    analyze_error(result.stderr)
    fix_implementation()
    retry_validation()
```

### 6. Validation Framework

**ONE-COMMAND VALIDATION:**
```bash
npm run test:agentic
```

This runs all 4 validation layers:
1. **Layer 1:** Static analysis (TypeScript, ESLint, unit tests)
2. **Layer 2:** Integration tests with localhost app
3. **Layer 3:** E2E flow validation  
4. **Layer 4:** Cross-platform verification

**Per-Task Validation:**
```bash
.vibe/verify-step-1.sh   # Exit 0 = pass, Exit 1 = fail
.vibe/verify-step-2.sh
# ... through step 30
```

### 7. Key Files Reference

| File | Purpose |
|------|---------|
| `PROJECT_DEFINITION_AGENTIC.md` | Complete project specification |
| `.env.example` | Environment configuration template |
| `.vibe/verify.sh` | Layer 1 automated validation |
| `.vibe/verify-step-N.sh` | Per-task validation scripts |
| `package.json` | Scripts and dependencies |

### 8. Success Metrics

✅ **All 30 tasks complete** (ZAM-1184 through ZAM-1213)
✅ **All validation scripts pass** (exit code 0)
✅ **Integration tests >95% success rate**
✅ **E2E flow works end-to-end**
✅ **Tests pass on macOS and Linux**
✅ **Performance targets met** (<10s simple, <30s complex)

---

## AI Agent Execution Tips

### Best Practices
1. **Read XML specs carefully** - All requirements defined there
2. **Run validation frequently** - Catch errors early
3. **Follow existing patterns** - Search codebase for similar code
4. **Iterate on failures** - Fix and re-validate up to 3 times
5. **Request help if stuck** - After 3 failed attempts

### Common Pitfalls
- ❌ Skipping validation scripts
- ❌ Not making verification scripts executable (`chmod +x`)
- ❌ Ignoring TypeScript/ESLint errors
- ❌ Creating new patterns instead of following existing ones
- ❌ Not testing on actual localhost application

### Error Recovery
1. Read error message carefully
2. Check recently changed files
3. Review task XML specification
4. Search for similar code in codebase
5. Make targeted fix (avoid over-engineering)
6. Re-run validation
7. If still failing after 3 attempts, request human help

---

## Quick Reference

### Essential Commands
```bash
# Setup and validation
npm install
npm run verify
npm run test:agentic

# Development
npm run typecheck
npm run lint
npm run lint:fix
npm run format

# Testing
npm test
npm run test:integration
npm run test:e2e

# Task validation
.vibe/verify-step-N.sh
```

### Linear Task Range
- **First Task:** ZAM-1184 (Setup AI-Optimized Dev Environment)
- **Last Task:** ZAM-1213 (Release Preparation & CI/CD)
- **Total:** 30 tasks across 4 phases

### Documentation
- **Complete Spec:** `PROJECT_DEFINITION_AGENTIC.md`
- **This Guide:** `AGENTIC_SETUP.md`
- **Environment:** `.env.example`
- **Sandbox Docs:** https://github.com/Zeeeepa/sandbox-runtime

---

## Support

**Stuck on a task?**
1. Review task XML specification in Linear
2. Check validation script: `.vibe/verify-step-N.sh`
3. Search codebase for similar patterns
4. Check PROJECT_DEFINITION_AGENTIC.md for context
5. Create Linear comment on task for human assistance

**Installation issues?**
- macOS: Ensure sandbox-exec available (built-in macOS 12+)
- Linux: Install bubblewrap (`sudo apt install bubblewrap`)
- Chrome: Install Chrome/Chromium browser

---

**Built for autonomous AI agent execution** 🤖🚀

**Last Updated:** 2025-10-24
**Version:** 1.0.0

