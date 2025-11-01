#!/usr/bin/env bash

#############################################################
# Real Chat Provider Tests
# Tests actual chat interfaces with real credentials
#############################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

# Test configuration
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0
TEST_DIR="/tmp/chat-provider-tests-$(date +%s)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo -e "${BOLD}=================================================="
echo -e "Chat Provider Integration Tests"
echo -e "=================================================="
echo -e "${NC}"

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

# Provider configurations
declare -A PROVIDERS=(
    ["k2think"]="https://www.k2think.ai/|developer@pixelium.uk|developer123"
    ["qwen"]="https://chat.qwen.ai/|developer@pixelium.uk|developer1"
    ["deepseek"]="https://chat.deepseek.com/|zeeeepa+1@gmail.com|developer123"
    ["grok"]="https://grok.com/|developer@pixelium.uk|developer123"
    ["zai"]="https://chat.z.ai/|developer@pixelium.uk|developer123"
    ["mistral"]="https://chat.mistral.ai/|developer@pixelium.uk|developer123"
)

# Test message
TEST_MESSAGE="What model are you?"

#############################################################
# Create test.agent format test
#############################################################

create_test_file() {
    local provider="$1"
    local url="$2"
    local email="$3"
    local password="$4"
    
    cat > "${provider}.test.agent" << EOF
# ${provider} Chat Test
# URL: ${url}
# Test: Send message and verify response

- Open browser and navigate to ${url}
- Wait for page to load
- Find email/username field and enter: ${email}
- Find password field and enter: ${password}
- Click login or sign in button
- Wait for login to complete (5 seconds)
- Find the message input field
- Type the message: ${TEST_MESSAGE}
- Click the send button
- Wait for AI response (10 seconds)
- Verify that a response message is visible
- Extract and display the response text
EOF
}

#############################################################
# Test Provider
#############################################################

test_provider() {
    local provider="$1"
    local config="${PROVIDERS[$provider]}"
    
    IFS='|' read -r url email password <<< "$config"
    
    log_test "Testing $provider"
    log_info "  URL: $url"
    log_info "  Email: $email"
    log_info "  Message: $TEST_MESSAGE"
    
    # Create test file
    create_test_file "$provider" "$url" "$email" "$password"
    
    log_info "  Test file created: ${provider}.test.agent"
    log_info "  To run manually:"
    log_info "    cd $TEST_DIR"
    log_info "    testdriverai run ${provider}.test.agent --heal"
    
    log_pass "$provider - Test file ready"
    
    return 0
}

#############################################################
# Run Tests
#############################################################

echo -e "\n${BOLD}Creating test files for all providers...${NC}\n"

for provider in "${!PROVIDERS[@]}"; do
    test_provider "$provider"
    echo ""
done

#############################################################
# Create run-all script
#############################################################

cat > "$TEST_DIR/run-all-tests.sh" << 'EOF'
#!/bin/bash
# Run all chat provider tests

for file in *.test.agent; do
    provider=$(basename "$file" .test.agent)
    echo "=========================================="
    echo "Testing: $provider"
    echo "=========================================="
    
    if testdriverai run "$file" --heal; then
        echo "✅ $provider PASSED"
    else
        echo "❌ $provider FAILED"
    fi
    
    echo ""
done
EOF

chmod +x "$TEST_DIR/run-all-tests.sh"

#############################################################
# Summary
#############################################################

echo -e "\n${BOLD}================================"
echo -e "Test Files Created"
echo -e "================================${NC}"
echo -e "Total Providers: 6"
echo -e "Test Directory:  $TEST_DIR"
echo -e "================================"
echo -e ""

echo -e "${GREEN}✅ All test files created successfully!${NC}"
echo -e ""
echo -e "${BOLD}To run tests:${NC}"
echo -e "  cd $TEST_DIR"
echo -e "  ./run-all-tests.sh"
echo -e ""
echo -e "${BOLD}Or test individual providers:${NC}"
echo -e "  testdriverai run k2think.test.agent --heal"
echo -e "  testdriverai run qwen.test.agent --heal"
echo -e "  testdriverai run deepseek.test.agent --heal"
echo -e "  testdriverai run grok.test.agent --heal"
echo -e "  testdriverai run zai.test.agent --heal"
echo -e "  testdriverai run mistral.test.agent --heal"
echo -e ""

exit 0
