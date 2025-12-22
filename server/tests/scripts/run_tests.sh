#!/bin/bash
set -e

echo "======================================"
echo "🧪 TestDriver.ai Proxy Server Tests"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kill any existing server
echo "🔄 Stopping any existing server..."
pkill -f "node server.js" 2>/dev/null || true
sleep 2

# Start server on port 8080
echo "🚀 Starting server on port 8080..."
PORT=8080 DEBUG=false node server.js > test_server.log 2>&1 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"
sleep 5

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="$3"
    local data="$4"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Testing: $name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
        echo "Response preview:"
        echo "$body" | head -5
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
        echo "Response:"
        echo "$body" | head -10
    fi
}

# Test 1: Health Check
test_endpoint "Health Check" "http://localhost:8080/health" "GET" ""

# Test 2: Root Endpoint
test_endpoint "Root Info" "http://localhost:8080/" "GET" ""

# Test 3: /input endpoint
test_endpoint "/input - Natural Language" \
    "http://localhost:8080/api/6.1.6/testdriver/input" \
    "POST" \
    '{"input":"Click the login button"}'

# Test 4: /generate endpoint
test_endpoint "/generate - Test Generation" \
    "http://localhost:8080/api/6.1.6/testdriver/generate" \
    "POST" \
    '{"context":"Login page"}'

# Test 5: /assert endpoint
test_endpoint "/assert - Assertion Verification" \
    "http://localhost:8080/api/6.1.6/testdriver/assert" \
    "POST" \
    '{"assertion":"Welcome message appears"}'

# Test 6: /error endpoint
test_endpoint "/error - Error Recovery" \
    "http://localhost:8080/api/6.1.6/testdriver/error" \
    "POST" \
    '{"error":"Button not found"}'

# Test 7: /check endpoint
test_endpoint "/check - Task Verification" \
    "http://localhost:8080/api/6.1.6/testdriver/check" \
    "POST" \
    '{"task":"Login successful"}'

echo ""
echo "======================================"
echo "📊 Test Summary"
echo "======================================"
echo "Server is running on http://localhost:8080"
echo "PID: $SERVER_PID"
echo ""
echo "✅ All basic connectivity tests completed!"
echo ""
echo "To test with TestDriver CLI:"
echo "  TD_API_ROOT=http://localhost:8080 npx testdriverai run test.yaml"
echo ""
echo "To stop the server:"
echo "  kill $SERVER_PID"
echo ""

# Keep server running
echo "Server will keep running. Press Ctrl+C to stop or run: kill $SERVER_PID"
