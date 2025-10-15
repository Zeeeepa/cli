# TestUI Testing Guide

This guide provides comprehensive instructions for testing all `testui` command usage patterns with the Anthropic API.

## Prerequisites

### 1. Anthropic API Key

You need an Anthropic API key set in your environment:

```bash
export ANTHROPIC_API_KEY='your-anthropic-api-key-here'
```

**How to get an API key:**
1. Sign up at https://console.anthropic.com/
2. Navigate to API Keys section
3. Create a new API key
4. Copy and export it in your terminal

### 2. Node.js and Dependencies

Ensure you have Node.js installed and dependencies set up:

```bash
cd testdriver-proxy
npm install
```

### 3. TestDriver AI CLI

The `testui` command uses `testdriverai` CLI tool. Install it globally:

```bash
npm install -g testdriverai
```

## Quick Start

### Manual Testing

From the `testdriver-proxy` directory, run individual commands:

```bash
# 1. Basic testing (auto-starts test app on port 4000)
node bin/testui PROMPT="click all buttons and verify"
node bin/testui PROMPT="login with test@example.com"

# 2. Test file execution
node bin/testui TEST="tests/testui-samples/simple-test.yaml"
node bin/testui TEST="tests/testui-samples/login-test.yaml"

# 3. External app testing
node bin/testui APP="http://localhost:3000" PROMPT="test checkout"
node bin/testui APP="https://myapp.com" PROMPT="verify homepage"

# 4. Shorthand
node bin/testui "click the signup button"

# 5. Help
node bin/testui --help
```

### Automated Test Suite

Run all test cases automatically:

```bash
cd testdriver-proxy
bash tests/test-testui-all-usages.sh
```

This will:
- ✅ Validate environment setup
- ✅ Test all usage patterns
- ✅ Generate a detailed test report
- ✅ Provide pass/fail statistics

## Test Cases Covered

### 1. **Help Command Test**
```bash
node bin/testui --help
```
**Expected:** Displays usage instructions and exits cleanly

### 2. **No Arguments Test**
```bash
node bin/testui
```
**Expected:** Shows error message and usage instructions

### 3. **Basic Prompt Test**
```bash
node bin/testui PROMPT="click all buttons and verify"
```
**Expected:** Starts test app on port 4000, runs AI agent, clicks buttons

### 4. **Login Prompt Test**
```bash
node bin/testui PROMPT="fill the email field with test@example.com"
```
**Expected:** AI fills email field in test app

### 5. **Shorthand Prompt Test**
```bash
node bin/testui "verify the page title"
```
**Expected:** AI verifies page title using shorthand syntax

### 6. **YAML File Test**
```bash
node bin/testui TEST="tests/testui-samples/simple-test.yaml"
```
**Expected:** Executes test steps from YAML file

### 7. **Login YAML Test**
```bash
node bin/testui TEST="tests/testui-samples/login-test.yaml"
```
**Expected:** Executes login flow from YAML definition

### 8. **External App Test**
```bash
node bin/testui APP="http://localhost:4000" PROMPT="verify the page loads"
```
**Expected:** Tests external application instead of auto-starting test app

## Understanding the Test Flow

### Auto-Start Mode (Default)
When `APP=` is not specified:
1. `testui` starts test app on port 4000
2. Starts proxy server on port 9876
3. Runs TestDriver AI against localhost:4000
4. Cleans up on completion

### External App Mode
When `APP=http://your-app:port` is specified:
1. Skips test app startup
2. Starts proxy server on port 9876
3. Runs TestDriver AI against specified URL
4. Cleans up on completion

## Environment Variables

### Required
- `ANTHROPIC_API_KEY` - Your Anthropic API key

### Optional
- `APP_URL` - Override default test app URL
- `TD_API_ROOT` - TestDriver API endpoint (default: http://localhost:9876)
- `PORT` - Proxy server port (default: 9876)

## Test Report

The automated test suite generates a detailed report:
- Location: `testdriver-proxy/testui-test-report-YYYYMMDD-HHMMSS.log`
- Contains: Test outcomes, error messages, timing information
- Format: Plain text with timestamps

Example report structure:
```
Test Report: testui-test-report-20250115-143022.log
Started: Tue Jan 15 14:30:22 UTC 2025

========================================
TEST: Help Command Test
========================================
[SUCCESS] Test passed: Help command

========================================
TEST: Basic Prompt Test
========================================
[INFO] Starting test app on port 4000...
[SUCCESS] Test passed: Basic prompt execution

...

Test Results Summary:
  Passed:  6
  Failed:  2
  Skipped: 0
  Total:   8
```

## Troubleshooting

### API Key Issues
```
❌ ANTHROPIC_API_KEY environment variable not set!
```
**Solution:** Export your API key:
```bash
export ANTHROPIC_API_KEY='sk-ant-...'
```

### Port Already in Use
```
❌ Failed to start test app on port 4000
```
**Solution:** Kill processes on port 4000:
```bash
lsof -ti:4000 | xargs kill -9
```

### TestDriver CLI Not Found
```
Command 'testdriverai' not found
```
**Solution:** Install globally:
```bash
npm install -g testdriverai
```

### Timeout Issues
Some tests may timeout due to:
- Slow API responses
- Rate limiting
- Network issues

**Solution:** Tests have 60s timeout. You can modify in the script if needed.

### Rate Limiting
Anthropic API has rate limits. If you see errors:
- Wait a few minutes between tests
- Check your API usage at https://console.anthropic.com/
- Consider upgrading your plan for higher limits

## Advanced Usage

### Custom Test YAML Files

Create your own test files in `tests/testui-samples/`:

```yaml
name: My Custom Test
steps:
  - action: navigate
    url: http://localhost:4000
  - action: click
    selector: button#submit
  - action: verify
    text: Success!
```

Run with:
```bash
node bin/testui TEST="tests/testui-samples/my-test.yaml"
```

### CI/CD Integration

For automated testing in CI/CD:

```bash
#!/bin/bash
# ci-test.sh

export ANTHROPIC_API_KEY="$CI_ANTHROPIC_KEY"
cd testdriver-proxy
npm install
bash tests/test-testui-all-usages.sh || exit 1
```

### Debugging

Enable debug mode by setting:
```bash
export DEBUG=true
node bin/testui PROMPT="test command"
```

## Performance Considerations

- **Test Duration:** Each AI test takes 10-30 seconds
- **Rate Limits:** Anthropic API has request limits
- **Timeouts:** Tests timeout after 60 seconds by default
- **Concurrency:** Run tests sequentially to avoid conflicts

## Best Practices

1. **Always set ANTHROPIC_API_KEY before testing**
2. **Run automated suite for comprehensive validation**
3. **Review test reports after each run**
4. **Clean up ports if tests fail mid-execution**
5. **Use timeouts to prevent hanging tests**
6. **Add delays between tests to respect rate limits**

## Next Steps

After validating all test cases:

1. ✅ Ensure all basic commands work
2. ✅ Verify YAML file processing
3. ✅ Test external app integration
4. ✅ Review error handling
5. ✅ Check cleanup behavior
6. 🚀 Deploy with confidence!

## Support

For issues or questions:
- Check the main [README.md](./README.md)
- Review [DOCUMENTATION.md](./DOCUMENTATION.md)
- Open an issue on GitHub
- Check Anthropic API status: https://status.anthropic.com/

---

**Happy Testing! 🧪✨**

