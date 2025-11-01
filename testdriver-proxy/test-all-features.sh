#!/usr/bin/env bash
# Comprehensive Test Suite for TestDriver.ai Proxy Server v2.0
# Tests ALL new features with Z.ai API

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:8090"
API_VERSION="1.0.0"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
log_test() {
  echo -e "${BLUE}[TEST $((TOTAL_TESTS+1))]${NC} $1"
  TOTAL_TESTS=$((TOTAL_TESTS+1))
}

log_success() {
  echo -e "${GREEN}✓ PASS${NC} $1"
  PASSED_TESTS=$((PASSED_TESTS+1))
}

log_failure() {
  echo -e "${RED}✗ FAIL${NC} $1"
  FAILED_TESTS=$((FAILED_TESTS+1))
}

log_info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

print_summary() {
  echo ""
  echo "================================"
  echo "Test Summary"
  echo "================================"
  echo -e "Total Tests:  ${TOTAL_TESTS}"
  echo -e "Passed:       ${GREEN}${PASSED_TESTS}${NC}"
  echo -e "Failed:       ${RED}${FAILED_TESTS}${NC}"
  echo "================================"
  
  if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    exit 0
  else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
  fi
}

# Trap to print summary on exit
trap print_summary EXIT

echo "========================================="
echo "TestDriver.ai Proxy Server v2.0"
echo "Comprehensive Feature Test Suite"
echo "========================================="
echo ""

# Test 0: Health Check
log_test "Health Check"
response=$(curl -s "$API_BASE/health")
if echo "$response" | jq -e '.status == "healthy"' > /dev/null; then
  log_success "Server is healthy"
else
  log_failure "Server health check failed"
  echo "$response"
  exit 1
fi

# Test 1: /input endpoint with ALL commands
log_test "/input - Convert natural language with ALL 20 commands"
response=$(curl -s -X POST "$API_BASE/api/$API_VERSION/testdriver/input" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "click the login button, type my email, press enter, scroll down until you see submit button, then remember the form data, assert the page loaded correctly, and if error occurs retry"
  }')

if echo "$response" | jq -e '.markdown' > /dev/null; then
  yaml=$(echo "$response" | jq -r '.markdown')
  log_success "Generated YAML with multiple command types"
  log_info "Sample YAML:"
  echo "$yaml" | head -20
else
  log_failure "Failed to generate YAML"
  echo "$response"
fi

# Test 2: Lifecycle - Provision
log_test "/lifecycle/provision - Execute provision script"
provision_yaml='version: 6.0.0
steps:
  - prompt: install chrome
    commands:
      - command: exec
        lang: pwsh
        code: |
          Write-Host "Installing Chrome..."
          # Download and install logic here'

response=$(curl -s -X POST "$API_BASE/api/$API_VERSION/testdriver/lifecycle/provision" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"test-session-001\",
    \"yamlContent\": $(echo "$provision_yaml" | jq -Rs .)
  }")

if echo "$response" | jq -e '.status == "completed"' > /dev/null; then
  log_success "Provision script executed"
  log_info "Summary: $(echo "$response" | jq -r '.markdown' | head -3)"
else
  log_failure "Provision script failed"
  echo "$response"
fi

# Test 3: Lifecycle - Prerun
log_test "/lifecycle/prerun - Execute prerun script"
prerun_yaml='version: 6.0.0
steps:
  - prompt: open chrome and navigate
    commands:
      - command: exec
        lang: pwsh
        code: Start-Process chrome.exe "https://example.com"
      - command: wait-for-text
        text: "Example Domain"
        timeout: 30000'

response=$(curl -s -X POST "$API_BASE/api/$API_VERSION/testdriver/lifecycle/prerun" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"test-session-001\",
    \"yamlContent\": $(echo "$prerun_yaml" | jq -Rs .)
  }")

if echo "$response" | jq -e '.status == "ready"' > /dev/null; then
  log_success "Prerun script executed"
else
  log_failure "Prerun script failed"
  echo "$response"
fi

# Test 4: Lifecycle - Postrun
log_test "/lifecycle/postrun - Execute postrun script"
postrun_yaml='version: 6.0.0
steps:
  - prompt: cleanup and generate report
    commands:
      - command: exec
        lang: pwsh
        code: |
          Write-Host "Generating test report..."
          # Report generation logic'

response=$(curl -s -X POST "$API_BASE/api/$API_VERSION/testdriver/lifecycle/postrun" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"test-session-001\",
    \"yamlContent\": $(echo "$postrun_yaml" | jq -Rs .),
    \"testResults\": {\"passed\": 5, \"failed\": 0, \"duration\": 12345}
  }")

if echo "$response" | jq -e '.status == "completed"' > /dev/null; then
  log_success "Postrun script executed"
else
  log_failure "Postrun script failed"
  echo "$response"
fi

# Test 5: Performance Analysis
log_test "/performance - Analyze test performance"
response=$(curl -s -X POST "$API_BASE/api/$API_VERSION/testdriver/performance" \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {"command": "hover-text", "duration": 1500},
      {"command": "type", "duration": 200},
      {"command": "click", "duration": 300},
      {"command": "wait-for-text", "duration": 3000}
    ],
    "timings": {
      "totalDuration": 5000
    },
    "networkActivity": {
      "requests": 12,
      "totalBytes": 524288
    }
  }')

if echo "$response" | jq -e '.metrics.totalOperations == 4' > /dev/null; then
  log_success "Performance analysis completed"
  avg_time=$(echo "$response" | jq -r '.metrics.averageOperationTime')
  log_info "Average operation time: ${avg_time}ms"
else
  log_failure "Performance analysis failed"
  echo "$response"
fi

# Test 6: Playwright Act Integration
log_test "/playwright/act - Convert action to YAML"
response=$(curl -s -X POST "$API_BASE/api/$API_VERSION/testdriver/playwright/act" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "click the submit button",
    "pageUrl": "https://example.com/form"
  }')

if echo "$response" | jq -e '.executable == true' > /dev/null; then
  log_success "Playwright Act generated executable YAML"
  log_info "Generated: $(echo "$response" | jq -r '.markdown' | head -3)"
else
  log_failure "Playwright Act failed"
  echo "$response"
fi

# Test 7: Generate Test Scenarios
log_test "/generate - Generate comprehensive test scenarios"
response=$(curl -s -X POST "$API_BASE/api/$API_VERSION/testdriver/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate test scenarios for a login page with email and password fields"
  }')

if echo "$response" | jq -e '.markdown' > /dev/null; then
  scenarios=$(echo "$response" | jq -r '.markdown')
  log_success "Generated test scenarios"
  log_info "Scenarios preview:"
  echo "$scenarios" | head -10
else
  log_failure "Test generation failed"
  echo "$response"
fi

# Test 8: Error Recovery
log_test "/error - AI-powered error recovery"
response=$(curl -s -X POST "$API_BASE/api/$API_VERSION/testdriver/error" \
  -H "Content-Type: application/json" \
  -d '{
    "error": "Button not found: Submit",
    "previousCommands": [
      {"command": "hover-text", "text": "Submit", "action": "click"}
    ],
    "context": "Attempting to submit a form but button element not found"
  }')

if echo "$response" | jq -e '.markdown' > /dev/null; then
  recovery=$(echo "$response" | jq -r '.markdown')
  log_success "Generated error recovery suggestions"
  log_info "Recovery: $(echo "$recovery" | head -5)"
else
  log_failure "Error recovery failed"
  echo "$response"
fi

# Test 9: Assertion Validation
log_test "/assert - Natural language assertion"
response=$(curl -s -X POST "$API_BASE/api/$API_VERSION/testdriver/assert" \
  -H "Content-Type: application/json" \
  -d '{
    "expect": "login form should be visible with email and password fields",
    "context": "After navigating to login page"
  }')

if echo "$response" | jq -e '.markdown' > /dev/null; then
  log_success "Assertion validated"
else
  log_failure "Assertion failed"
  echo "$response"
fi

# Test 10: Check Task Completion
log_test "/check - Verify task completion"
response=$(curl -s -X POST "$API_BASE/api/$API_VERSION/testdriver/check" \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "verify that user successfully logged in",
    "context": "After clicking login button and entering credentials"
  }')

if echo "$response" | jq -e '.markdown' > /dev/null; then
  log_success "Task verification completed"
else
  log_failure "Task verification failed"
  echo "$response"
fi

# Test 11: Deep Health Check with API connectivity
log_test "/health/full - Deep health check with API test"
response=$(curl -s "$API_BASE/health/full")
if echo "$response" | jq -e '.dependencies.apiEndpoint.status' > /dev/null; then
  api_status=$(echo "$response" | jq -r '.dependencies.apiEndpoint.status')
  if [ "$api_status" = "healthy" ]; then
    log_success "API endpoint connectivity verified"
    response_time=$(echo "$response" | jq -r '.dependencies.apiEndpoint.responseTime')
    log_info "API response time: $response_time"
  else
    log_failure "API endpoint unhealthy: $(echo "$response" | jq -r '.dependencies.apiEndpoint.error')"
  fi
else
  log_failure "Deep health check failed"
  echo "$response"
fi

# Test 12: Root endpoint - API documentation
log_test "/ - API documentation and feature list"
response=$(curl -s "$API_BASE/")
if echo "$response" | jq -e '.version == "2.0.0"' > /dev/null; then
  log_success "API documentation available"
  endpoint_count=$(echo "$response" | jq '.endpoints | length')
  feature_count=$(echo "$response" | jq '.features | length')
  log_info "Endpoints: $endpoint_count, Features: $feature_count"
  
  # Verify all features are marked as true
  lifecycle=$(echo "$response" | jq -r '.features.lifecycle')
  performance=$(echo "$response" | jq -r '.features.performance')
  playwright=$(echo "$response" | jq -r '.features.playwright')
  
  if [ "$lifecycle" = "true" ] && [ "$performance" = "true" ] && [ "$playwright" = "true" ]; then
    log_success "All new features enabled"
  else
    log_failure "Some features not enabled"
  fi
else
  log_failure "API documentation check failed"
  echo "$response"
fi

echo ""
echo "========================================="
echo "Feature Completeness Check"
echo "========================================="
echo ""

# Verify server reports all features
server_info=$(curl -s "$API_BASE/")
echo "Server Version: $(echo "$server_info" | jq -r '.version')"
echo "Total Commands: $(echo "$server_info" | jq -r '.features.commands')"
echo "Lifecycle Support: $(echo "$server_info" | jq -r '.features.lifecycle')"
echo "Performance Tracking: $(echo "$server_info" | jq -r '.features.performance')"
echo "Playwright Integration: $(echo "$server_info" | jq -r '.features.playwright')"
echo "WebSocket Support: $(echo "$server_info" | jq -r '.features.websocket')"
echo "Vision AI: $(echo "$server_info" | jq -r '.features.vision')"

echo ""
echo "Generation Model: $(echo "$server_info" | jq -r '.config.generationModel')"
echo "Vision Model: $(echo "$server_info" | jq -r '.config.visionModel')"
echo "API Base URL: $(echo "$server_info" | jq -r '.config.apiBaseUrl')"

