#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   TestDriver Proxy - Live Integration Tests${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo -e "${RED}Error: node is required but not installed.${NC}" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo -e "${RED}Error: curl is required but not installed.${NC}" >&2; exit 1; }

# Configuration
PROXY_PORT=8080
APP_PORT=4000
PROXY_URL="http://localhost:$PROXY_PORT"
APP_URL="http://localhost:$APP_PORT"
API_VERSION="1.0.0"

# Start test app server
echo -e "${YELLOW}Step 1: Starting test application on port $APP_PORT...${NC}"
cd test-app
node server.js > /dev/null 2>&1 &
APP_PID=$!
cd ..
sleep 2

if ! kill -0 $APP_PID 2>/dev/null; then
    echo -e "${RED}✗ Failed to start test application${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Test application started (PID: $APP_PID)${NC}"
echo ""

# Start proxy server
echo -e "${YELLOW}Step 2: Starting proxy server on port $PROXY_PORT...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env file not found. Please create it from .env.example${NC}"
    kill $APP_PID
    exit 1
fi

node server.js > proxy.log 2>&1 &
PROXY_PID=$!
sleep 3

if ! kill -0 $PROXY_PID 2>/dev/null; then
    echo -e "${RED}✗ Failed to start proxy server${NC}"
    echo -e "${RED}Check proxy.log for details${NC}"
    kill $APP_PID
    exit 1
fi
echo -e "${GREEN}✓ Proxy server started (PID: $PROXY_PID)${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Cleaning up...${NC}"
    kill $PROXY_PID 2>/dev/null
    kill $APP_PID 2>/dev/null
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}
trap cleanup EXIT

# Function to take screenshot using curl
take_screenshot() {
    # For now, just simulate - real implementation would use browser automation
    echo "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}

# Wait for servers to be ready
echo -e "${YELLOW}Step 3: Checking server health...${NC}"
sleep 2

# Health check
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null $PROXY_URL/health)
if [ "$HEALTH_RESPONSE" != "200" ]; then
    echo -e "${RED}✗ Proxy server health check failed (HTTP $HEALTH_RESPONSE)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Proxy server is healthy${NC}"
echo ""

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Running Live Integration Tests${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Test 1: /input endpoint - Natural language to YAML
echo -e "${YELLOW}Test 1: Testing /input endpoint (Natural language → YAML)${NC}"
INPUT_TEST='{"input": "Navigate to http://localhost:4000 then type demo@testdriver.ai in the email field and TestPass123! in the password field, then click the Sign In button"}'

INPUT_RESPONSE=$(curl -s -X POST "$PROXY_URL/api/$API_VERSION/testdriver/input" \
    -H "Content-Type: application/json" \
    -d "$INPUT_TEST" \
    -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$INPUT_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$INPUT_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ /input endpoint PASS (HTTP $HTTP_CODE)${NC}"
    echo -e "${BLUE}  Response preview:${NC}"
    echo "$RESPONSE_BODY" | head -10
else
    echo -e "${RED}✗ /input endpoint FAIL (HTTP $HTTP_CODE)${NC}"
    echo "$RESPONSE_BODY"
fi
echo ""

# Test 2: /generate endpoint - Test scenario generation
echo -e "${YELLOW}Test 2: Testing /generate endpoint (Test generation)${NC}"
GENERATE_TEST='{"prompt": "Generate comprehensive test scenarios for a login page with email and password fields, including happy path, error cases, and edge cases"}'

GENERATE_RESPONSE=$(curl -s -X POST "$PROXY_URL/api/$API_VERSION/testdriver/generate" \
    -H "Content-Type: application/json" \
    -d "$GENERATE_TEST" \
    -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$GENERATE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$GENERATE_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ /generate endpoint PASS (HTTP $HTTP_CODE)${NC}"
    echo -e "${BLUE}  Generated scenarios:${NC}"
    echo "$RESPONSE_BODY" | head -15
else
    echo -e "${RED}✗ /generate endpoint FAIL (HTTP $HTTP_CODE)${NC}"
    echo "$RESPONSE_BODY"
fi
echo ""

# Test 3: /assert endpoint - Assertion verification
echo -e "${YELLOW}Test 3: Testing /assert endpoint (Assertion verification)${NC}"
SCREENSHOT=$(take_screenshot)
ASSERT_TEST="{\"expect\": \"Login form with email and password fields should be visible\", \"screenshot\": \"$SCREENSHOT\"}"

ASSERT_RESPONSE=$(curl -s -X POST "$PROXY_URL/api/$API_VERSION/testdriver/assert" \
    -H "Content-Type: application/json" \
    -d "$ASSERT_TEST" \
    -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$ASSERT_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$ASSERT_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ /assert endpoint PASS (HTTP $HTTP_CODE)${NC}"
    echo -e "${BLUE}  Response:${NC}"
    echo "$RESPONSE_BODY"
else
    echo -e "${RED}✗ /assert endpoint FAIL (HTTP $HTTP_CODE)${NC}"
    echo "$RESPONSE_BODY"
fi
echo ""

# Test 4: /error endpoint - Error recovery
echo -e "${YELLOW}Test 4: Testing /error endpoint (Error recovery)${NC}"
ERROR_TEST='{"error": "Button with text \"Submit\" not found on page", "screenshot": "'$SCREENSHOT'", "context": "Attempting to click submit button after filling login form"}'

ERROR_RESPONSE=$(curl -s -X POST "$PROXY_URL/api/$API_VERSION/testdriver/error" \
    -H "Content-Type: application/json" \
    -d "$ERROR_TEST" \
    -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$ERROR_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$ERROR_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ /error endpoint PASS (HTTP $HTTP_CODE)${NC}"
    echo -e "${BLUE}  Recovery suggestions:${NC}"
    echo "$RESPONSE_BODY" | head -10
else
    echo -e "${RED}✗ /error endpoint FAIL (HTTP $HTTP_CODE)${NC}"
    echo "$RESPONSE_BODY"
fi
echo ""

# Test 5: /check endpoint - Task verification
echo -e "${YELLOW}Test 5: Testing /check endpoint (Task verification)${NC}"
CHECK_TEST='{"instruction": "Verify that the login form is displayed", "screenshot_before": "'$SCREENSHOT'", "screenshot_after": "'$SCREENSHOT'"}'

CHECK_RESPONSE=$(curl -s -X POST "$PROXY_URL/api/$API_VERSION/testdriver/check" \
    -H "Content-Type: application/json" \
    -d "$CHECK_TEST" \
    -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$CHECK_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CHECK_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ /check endpoint PASS (HTTP $HTTP_CODE)${NC}"
    echo -e "${BLUE}  Verification result:${NC}"
    echo "$RESPONSE_BODY"
else
    echo -e "${RED}✗ /check endpoint FAIL (HTTP $HTTP_CODE)${NC}"
    echo "$RESPONSE_BODY"
fi
echo ""

# Summary
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Test Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}✓ All 5 core endpoints tested${NC}"
echo -e "${GREEN}✓ Test application served on http://localhost:$APP_PORT${NC}"
echo -e "${GREEN}✓ Proxy server running on http://localhost:$PROXY_PORT${NC}"
echo ""
echo -e "${YELLOW}To manually test the UI:${NC}"
echo -e "  1. Open ${BLUE}http://localhost:$APP_PORT${NC} in your browser"
echo -e "  2. Use credentials: ${BLUE}demo@testdriver.ai${NC} / ${BLUE}TestPass123!${NC}"
echo -e "  3. Interact with the application"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop servers and exit${NC}"

# Keep servers running for manual testing
wait
