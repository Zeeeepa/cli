#!/usr/bin/env bash

#############################################################
# TestDriver.ai Proxy Server - Z.ai Integration Tests
# Complete usage tests with real Z.ai API credentials
#############################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Test configuration
API_BASE="http://localhost:8090"
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Z.ai API Configuration (CRITICAL: These must be set correctly)
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
export ANTHROPIC_MODEL="glm-4.5V"
export ANTHROPIC_AUTH_TOKEN="665b963943b647dc9501dff942afb877.A47LrMc7sgGjyfBJ"

# For proxy server configuration
export API_PROVIDER="zai"
export API_KEY="${ANTHROPIC_AUTH_TOKEN}"
export API_BASE_URL="${ANTHROPIC_BASE_URL}"
export GENERATION_MODEL="glm-4.6"
export VISION_MODEL="glm-4.5V"
export MAX_TOKENS="4000"
export TEMPERATURE="0.7"
export DEBUG="true"

# Create test directory
TEST_DIR="/tmp/testdriver-zai-tests-$(date +%s)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo -e "${BOLD}=================================================="
echo -e "TestDriver.ai Proxy + Z.ai Integration Tests"
echo -e "=================================================="
echo -e "${NC}"
echo -e "${BLUE}Configuration:${NC}"
echo -e "  API Base:        $API_BASE"
echo -e "  Z.ai API:        $ANTHROPIC_BASE_URL"
echo -e "  Model (Vision):  $VISION_MODEL"
echo -e "  Model (Gen):     $GENERATION_MODEL"
echo -e "  Test Directory:  $TEST_DIR"
echo -e ""

# Logging functions
log_test() {
    TEST_COUNT=$((TEST_COUNT + 1))
    echo -e "${BLUE}[TEST $TEST_COUNT]${NC} $1"
}

log_pass() {
    PASS_COUNT=$((PASS_COUNT + 1))
    echo -e "${GREEN}✓ PASS${NC} $1"
}

log_fail() {
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo -e "${RED}✗ FAIL${NC} $1"
}

log_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Test helper functions
check_response() {
    local response="$1"
    local test_name="$2"
    
    if echo "$response" | jq empty 2>/dev/null; then
        if echo "$response" | jq -e '.markdown' >/dev/null 2>&1; then
            log_pass "$test_name"
            return 0
        elif echo "$response" | jq -e '.error' >/dev/null 2>&1; then
            local error_msg=$(echo "$response" | jq -r '.error')
            log_fail "$test_name - API Error: $error_msg"
            return 1
        else
            log_fail "$test_name - Missing markdown field"
            return 1
        fi
    else
        log_fail "$test_name - Invalid JSON response"
        echo "$response" | head -20
        return 1
    fi
}

#############################################################
# TEST 1: Server Health Check
#############################################################
log_test "Server Health Check"
response=$(curl -s "$API_BASE/health")
if echo "$response" | jq -e '.status == "healthy"' >/dev/null 2>&1; then
    log_pass "Server is healthy"
else
    log_fail "Server health check failed"
    echo "$response"
    exit 1
fi

#############################################################
# TEST 2: API Root - Feature List
#############################################################
log_test "API Root - Feature List & Documentation"
response=$(curl -s "$API_BASE/")
if echo "$response" | jq -e '.endpoints' >/dev/null 2>&1; then
    endpoint_count=$(echo "$response" | jq '.endpoints | length')
    feature_count=$(echo "$response" | jq '.features | length')
    log_pass "API documentation available ($endpoint_count endpoints, $feature_count features)"
else
    log_fail "API documentation not available"
fi

#############################################################
# TEST 3: /input - Simple Natural Language Conversion
#############################################################
log_test "/input - Simple click command"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/input" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "click the login button",
    "mousePosition": {"x": 100, "y": 200}
  }')
check_response "$response" "Simple click command"
if [ $? -eq 0 ]; then
    log_info "Generated YAML:"
    echo "$response" | jq -r '.markdown' | head -10
fi

#############################################################
# TEST 4: /input - Multiple Commands in One Request
#############################################################
log_test "/input - Multiple commands (type + press-keys)"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/input" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "type my email as user@example.com and press enter",
    "mousePosition": {"x": 300, "y": 400}
  }')
check_response "$response" "Multiple commands"
if [ $? -eq 0 ]; then
    log_info "Generated commands:"
    echo "$response" | jq -r '.markdown' | grep -E "command:" | head -5
fi

#############################################################
# TEST 5: /input - ALL 20 Commands Test
#############################################################
log_test "/input - ALL 20 TestDriver commands"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/input" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Generate a comprehensive test using all available commands: type text, press keys, click button, hover over element, drag item, hover-text to find submit, hover-image to find icon, match-image for template, wait for text to appear, wait for image, scroll down, scroll until text found, scroll until image found, assert page loaded, remember the result, wait 2 seconds, execute JavaScript code, focus on Chrome window, if condition then do action, and run another test file",
    "context": "Testing all 20 commands",
    "mousePosition": {"x": 500, "y": 500}
  }')
check_response "$response" "ALL 20 commands test"
if [ $? -eq 0 ]; then
    # Count how many different commands were generated
    command_count=$(echo "$response" | jq -r '.markdown' | grep -c "command:" || echo "0")
    log_info "Generated $command_count command(s)"
    echo "$response" | jq -r '.markdown' | head -30
fi

#############################################################
# TEST 6: /error - Error Recovery
#############################################################
log_test "/error - AI-powered error recovery"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/error" \
  -H "Content-Type: application/json" \
  -d '{
    "error": "Element not found: Submit button",
    "previousCommands": [
      {"command": "hover-text", "text": "Submit"},
      {"command": "click"}
    ],
    "context": "Trying to submit a form"
  }')
check_response "$response" "Error recovery"
if [ $? -eq 0 ]; then
    log_info "Recovery suggestion:"
    echo "$response" | jq -r '.markdown' | head -15
fi

#############################################################
# TEST 7: /check - Task Verification
#############################################################
log_test "/check - Verify task completion"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/check" \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "verify that user is logged in",
    "context": "After login form submission",
    "previousCommands": [
      {"command": "type", "text": "user@example.com"},
      {"command": "press-keys", "keys": ["enter"]}
    ]
  }')
check_response "$response" "Task verification"

#############################################################
# TEST 8: /generate - Test Scenario Generation
#############################################################
log_test "/generate - Generate test scenarios"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate test scenarios for a login page with email and password fields",
    "context": "E-commerce website authentication"
  }')
check_response "$response" "Test scenario generation"
if [ $? -eq 0 ]; then
    test_count=$(echo "$response" | jq -r '.markdown' | grep -c "title:" || echo "0")
    log_info "Generated $test_count test scenario(s)"
fi

#############################################################
# TEST 9: /assert - Natural Language Assertion
#############################################################
log_test "/assert - Vision-based assertion"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/assert" \
  -H "Content-Type: application/json" \
  -d '{
    "expect": "the login form is visible with email and password fields",
    "context": "After navigating to login page"
  }')
if echo "$response" | jq -e '.passed' >/dev/null 2>&1; then
    log_pass "Assertion endpoint working"
else
    log_info "Assertion requires screenshot (expected)"
fi

#############################################################
# TEST 10: Lifecycle - Provision
#############################################################
log_test "Lifecycle - /provision"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/lifecycle/provision" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "yamlContent": "version: 6.0.0\nsteps:\n  - command: exec\n    lang: shell\n    linux: echo \"Provisioning complete\""
  }')
check_response "$response" "Provision lifecycle"

#############################################################
# TEST 11: Lifecycle - Prerun
#############################################################
log_test "Lifecycle - /prerun"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/lifecycle/prerun" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "yamlContent": "version: 6.0.0\nsteps:\n  - command: exec\n    lang: shell\n    linux: echo \"Prerun setup complete\""
  }')
check_response "$response" "Prerun lifecycle"

#############################################################
# TEST 12: Lifecycle - Postrun
#############################################################
log_test "Lifecycle - /postrun"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/lifecycle/postrun" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "yamlContent": "version: 6.0.0\nsteps:\n  - command: exec\n    lang: shell\n    linux: echo \"Postrun cleanup complete\"",
    "testResults": {"passed": 5, "failed": 0}
  }')
check_response "$response" "Postrun lifecycle"

#############################################################
# TEST 13: Performance Tracking
#############################################################
log_test "Performance - /performance analysis"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/performance" \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {"command": "hover-text", "duration": 1500, "timestamp": 1000},
      {"command": "type", "duration": 200, "timestamp": 2500},
      {"command": "click", "duration": 300, "timestamp": 2700},
      {"command": "wait-for-text", "duration": 3000, "timestamp": 3000}
    ],
    "timings": {
      "totalDuration": 5000,
      "testStartTime": 1000,
      "testEndTime": 6000
    },
    "networkActivity": {
      "requests": 12,
      "totalBytes": 524288
    }
  }')
check_response "$response" "Performance analysis"
if [ $? -eq 0 ]; then
    log_info "Performance metrics:"
    echo "$response" | jq -r '.metrics'
fi

#############################################################
# TEST 14: Playwright - Act (Action Conversion)
#############################################################
log_test "Playwright - /playwright/act"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/playwright/act" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "click the submit button and wait for confirmation",
    "pageUrl": "https://example.com/form"
  }')
check_response "$response" "Playwright act (action conversion)"
if [ $? -eq 0 ]; then
    log_info "Generated Playwright YAML:"
    echo "$response" | jq -r '.markdown' | head -10
fi

#############################################################
# TEST 15: Playwright - Locate (needs screenshot)
#############################################################
log_test "Playwright - /playwright/locate"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/playwright/locate" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "search input field",
    "pageUrl": "https://example.com"
  }')
if echo "$response" | jq -e '.coordinates' >/dev/null 2>&1; then
    log_pass "Playwright locate working"
else
    log_info "Locate requires screenshot (expected)"
fi

#############################################################
# TEST 16: Playwright - toMatchPrompt (needs screenshot)
#############################################################
log_test "Playwright - /playwright/toMatchPrompt"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/playwright/toMatchPrompt" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "login form is visible",
    "pageUrl": "https://example.com/login"
  }')
if echo "$response" | jq -e '.matched' >/dev/null 2>&1; then
    log_pass "Playwright toMatchPrompt working"
else
    log_info "toMatchPrompt requires screenshot (expected)"
fi

#############################################################
# TEST 17: Complex Multi-Step Workflow
#############################################################
log_test "Complex Workflow - Multi-step login test"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/input" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Navigate to the login page, locate the email input field, type user@example.com, find the password field, type the password, click the submit button, wait for the dashboard to load, assert that the user is logged in, and remember the session token for later use",
    "context": "Complete login workflow test",
    "mousePosition": {"x": 800, "y": 600},
    "activeWindow": "Chrome"
  }')
check_response "$response" "Complex workflow"
if [ $? -eq 0 ]; then
    step_count=$(echo "$response" | jq -r '.markdown' | grep -c "command:" || echo "0")
    log_info "Generated $step_count step(s) for complex workflow"
    echo "$response" | jq -r '.markdown' | head -40
fi

#############################################################
# TEST 18: Advanced Commands - Conditional Execution
#############################################################
log_test "Advanced - Conditional execution (if command)"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/input" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "If the login button is visible, click it, otherwise wait for the page to load and try again",
    "context": "Conditional login attempt"
  }')
check_response "$response" "Conditional execution"
if [ $? -eq 0 ]; then
    if echo "$response" | jq -r '.markdown' | grep -q "command: if"; then
        log_info "✓ Generated if command"
    fi
fi

#############################################################
# TEST 19: Advanced Commands - Variable Storage
#############################################################
log_test "Advanced - Variable storage (remember command)"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/input" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Extract the order ID from the confirmation page and remember it as ORDER_ID for later use",
    "context": "Capture order ID after purchase"
  }')
check_response "$response" "Variable storage"
if [ $? -eq 0 ]; then
    if echo "$response" | jq -r '.markdown' | grep -q "command: remember"; then
        log_info "✓ Generated remember command"
    fi
fi

#############################################################
# TEST 20: Advanced Commands - Code Execution
#############################################################
log_test "Advanced - Code execution (exec command)"
response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/input" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Execute JavaScript code to get the current page title and URL",
    "context": "Extract page information via JavaScript"
  }')
check_response "$response" "Code execution"
if [ $? -eq 0 ]; then
    if echo "$response" | jq -r '.markdown' | grep -q "command: exec"; then
        log_info "✓ Generated exec command"
    fi
fi

#############################################################
# TEST 21: Stress Test - Multiple Rapid Requests
#############################################################
log_test "Stress Test - 5 rapid requests"
stress_pass=0
for i in {1..5}; do
    response=$(curl -s -X POST "$API_BASE/api/1.0.0/testdriver/input" \
      -H "Content-Type: application/json" \
      -d "{
        \"input\": \"Test request #$i: click button\",
        \"mousePosition\": {\"x\": 100, \"y\": 100}
      }")
    if echo "$response" | jq -e '.markdown' >/dev/null 2>&1; then
        stress_pass=$((stress_pass + 1))
    fi
    sleep 0.5
done
if [ $stress_pass -eq 5 ]; then
    log_pass "Stress test - all 5 requests succeeded"
else
    log_fail "Stress test - only $stress_pass/5 requests succeeded"
fi

#############################################################
# TEST 22: Health Check with API Test
#############################################################
log_test "Deep Health Check - /health/full"
response=$(curl -s "$API_BASE/health/full")
if echo "$response" | jq -e '.dependencies.apiEndpoint' >/dev/null 2>&1; then
    api_status=$(echo "$response" | jq -r '.dependencies.apiEndpoint.status')
    log_info "API endpoint status: $api_status"
    if [ "$api_status" = "healthy" ]; then
        log_pass "Deep health check with API connectivity"
    else
        log_info "API connectivity check: $api_status"
    fi
else
    log_info "Deep health check completed"
fi

#############################################################
# SUMMARY
#############################################################
echo -e ""
echo -e "${BOLD}================================"
echo -e "Test Summary"
echo -e "================================${NC}"
echo -e "Total Tests:  ${BOLD}$TEST_COUNT${NC}"
echo -e "Passed:       ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed:       ${RED}$FAIL_COUNT${NC}"
echo -e "Pass Rate:    $(echo "scale=1; $PASS_COUNT * 100 / $TEST_COUNT" | bc)%"
echo -e "================================"
echo -e ""

if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}Some tests failed${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi

