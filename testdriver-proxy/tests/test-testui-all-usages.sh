#!/bin/bash

# ============================================================================
# Comprehensive testui Command Test Script
# Tests all usage patterns with Anthropic API from environment variables
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Test results tracking
PASSED=0
FAILED=0
SKIPPED=0

# Test report file
REPORT_FILE="testui-test-report-$(date +%Y%m%d-%H%M%S).log"

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
    echo "[INFO] $1" >> "$REPORT_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo "[SUCCESS] $1" >> "$REPORT_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    echo "[ERROR] $1" >> "$REPORT_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    echo "[WARNING] $1" >> "$REPORT_FILE"
}

log_test_start() {
    echo -e "\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🧪 Test: $1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "" >> "$REPORT_FILE"
    echo "========================================" >> "$REPORT_FILE"
    echo "TEST: $1" >> "$REPORT_FILE"
    echo "========================================" >> "$REPORT_FILE"
}

# ============================================================================
# Environment Validation
# ============================================================================

validate_environment() {
    log_info "Validating test environment..."
    
    # Check if ANTHROPIC_API_KEY is set
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        log_error "ANTHROPIC_API_KEY environment variable is not set!"
        echo ""
        log_warning "Please set your Anthropic API key:"
        echo -e "  ${CYAN}export ANTHROPIC_API_KEY='your-api-key-here'${NC}"
        echo ""
        exit 1
    fi
    
    log_success "ANTHROPIC_API_KEY is set (${#ANTHROPIC_API_KEY} characters)"
    
    # Check if we're in the testdriver-proxy directory
    if [ ! -f "package.json" ] || [ ! -d "bin" ]; then
        log_error "Must be run from testdriver-proxy directory"
        exit 1
    fi
    
    # Check if testui command exists
    if [ ! -f "bin/testui" ]; then
        log_error "testui command not found at bin/testui"
        exit 1
    fi
    
    log_success "testui command found"
    
    # Check if node modules are installed
    if [ ! -d "node_modules" ]; then
        log_warning "node_modules not found, running npm install..."
        npm install
    fi
    
    log_success "Environment validation complete"
}

# ============================================================================
# Test App Validation
# ============================================================================

validate_test_app() {
    log_info "Validating test app..."
    
    if [ ! -f "tests/ui/test-app/server.js" ]; then
        log_error "Test app not found at tests/ui/test-app/server.js"
        exit 1
    fi
    
    if [ ! -f "tests/ui/test-app/index.html" ]; then
        log_error "Test app HTML not found at tests/ui/test-app/index.html"
        exit 1
    fi
    
    log_success "Test app files validated"
}

# ============================================================================
# Create Test YAML Files
# ============================================================================

create_test_files() {
    log_info "Creating test YAML files..."
    
    mkdir -p tests/testui-samples
    
    # Create a simple test file
    cat > tests/testui-samples/simple-test.yaml <<EOF
name: Simple Button Test
steps:
  - action: navigate
    url: http://localhost:4000
  - action: click
    selector: button
    text: Click Me
  - action: verify
    text: You clicked the button!
EOF
    
    # Create a login test file
    cat > tests/testui-samples/login-test.yaml <<EOF
name: Login Flow Test
steps:
  - action: navigate
    url: http://localhost:4000
  - action: fill
    selector: input[type="email"]
    value: test@example.com
  - action: fill
    selector: input[type="password"]
    value: TestPass123
  - action: click
    selector: button[type="submit"]
  - action: verify
    text: Login successful
EOF
    
    log_success "Test YAML files created in tests/testui-samples/"
}

# ============================================================================
# Test Cases
# ============================================================================

# Test 1: Basic prompt test
test_basic_prompt() {
    log_test_start "Basic Prompt Test (auto-starts test app)"
    
    TIMEOUT=60
    if timeout $TIMEOUT node bin/testui PROMPT="click all buttons and verify" 2>&1 | tee -a "$REPORT_FILE"; then
        log_success "Test passed: Basic prompt execution"
        ((PASSED++))
        return 0
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            log_error "Test timed out after ${TIMEOUT}s"
        else
            log_error "Test failed with exit code: $EXIT_CODE"
        fi
        ((FAILED++))
        return 1
    fi
}

# Test 2: Prompt with login test
test_login_prompt() {
    log_test_start "Login Prompt Test"
    
    TIMEOUT=60
    if timeout $TIMEOUT node bin/testui PROMPT="fill the email field with test@example.com" 2>&1 | tee -a "$REPORT_FILE"; then
        log_success "Test passed: Login prompt execution"
        ((PASSED++))
        return 0
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            log_error "Test timed out after ${TIMEOUT}s"
        else
            log_error "Test failed with exit code: $EXIT_CODE"
        fi
        ((FAILED++))
        return 1
    fi
}

# Test 3: YAML file test
test_yaml_file() {
    log_test_start "YAML File Test"
    
    TIMEOUT=60
    if timeout $TIMEOUT node bin/testui TEST="tests/testui-samples/simple-test.yaml" 2>&1 | tee -a "$REPORT_FILE"; then
        log_success "Test passed: YAML file execution"
        ((PASSED++))
        return 0
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            log_error "Test timed out after ${TIMEOUT}s"
        else
            log_error "Test failed with exit code: $EXIT_CODE"
        fi
        ((FAILED++))
        return 1
    fi
}

# Test 4: Login YAML file test
test_login_yaml() {
    log_test_start "Login YAML File Test"
    
    TIMEOUT=60
    if timeout $TIMEOUT node bin/testui TEST="tests/testui-samples/login-test.yaml" 2>&1 | tee -a "$REPORT_FILE"; then
        log_success "Test passed: Login YAML execution"
        ((PASSED++))
        return 0
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            log_error "Test timed out after ${TIMEOUT}s"
        else
            log_error "Test failed with exit code: $EXIT_CODE"
        fi
        ((FAILED++))
        return 1
    fi
}

# Test 5: External app test (requires manual app)
test_external_app() {
    log_test_start "External App Test (http://localhost:4000)"
    
    # Start the test app manually in background
    node tests/ui/test-app/server.js &
    TEST_APP_PID=$!
    sleep 3
    
    TIMEOUT=60
    if timeout $TIMEOUT node bin/testui APP="http://localhost:4000" PROMPT="verify the page loads" 2>&1 | tee -a "$REPORT_FILE"; then
        log_success "Test passed: External app test"
        ((PASSED++))
        kill $TEST_APP_PID 2>/dev/null || true
        return 0
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            log_error "Test timed out after ${TIMEOUT}s"
        else
            log_error "Test failed with exit code: $EXIT_CODE"
        fi
        ((FAILED++))
        kill $TEST_APP_PID 2>/dev/null || true
        return 1
    fi
}

# Test 6: Shorthand prompt test
test_shorthand_prompt() {
    log_test_start "Shorthand Prompt Test (positional argument)"
    
    TIMEOUT=60
    if timeout $TIMEOUT node bin/testui "verify the page title" 2>&1 | tee -a "$REPORT_FILE"; then
        log_success "Test passed: Shorthand prompt execution"
        ((PASSED++))
        return 0
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            log_error "Test timed out after ${TIMEOUT}s"
        else
            log_error "Test failed with exit code: $EXIT_CODE"
        fi
        ((FAILED++))
        return 1
    fi
}

# Test 7: Help command test
test_help_command() {
    log_test_start "Help Command Test"
    
    if node bin/testui --help 2>&1 | tee -a "$REPORT_FILE"; then
        log_success "Test passed: Help command"
        ((PASSED++))
        return 0
    else
        log_error "Test failed: Help command"
        ((FAILED++))
        return 1
    fi
}

# Test 8: No arguments test (should show error)
test_no_arguments() {
    log_test_start "No Arguments Test (should fail gracefully)"
    
    if node bin/testui 2>&1 | tee -a "$REPORT_FILE"; then
        log_error "Test should have failed but passed"
        ((FAILED++))
        return 1
    else
        log_success "Test passed: Correctly rejected no arguments"
        ((PASSED++))
        return 0
    fi
}

# ============================================================================
# Test Suite Execution
# ============================================================================

run_test_suite() {
    echo -e "\n${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║          TestUI Comprehensive Test Suite                      ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}\n"
    
    echo "Test Report: $REPORT_FILE" | tee "$REPORT_FILE"
    echo "Started: $(date)" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
    
    # Run validation
    validate_environment
    validate_test_app
    create_test_files
    
    echo -e "\n${YELLOW}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Starting Test Execution...${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}\n"
    
    # Run all tests
    # Note: Some tests might fail due to timing or API limitations
    # Tests are run with timeouts to prevent hanging
    
    log_warning "Note: Some tests may take time or fail due to API rate limits or connectivity issues"
    echo ""
    
    # Quick tests first
    test_help_command || true
    test_no_arguments || true
    
    # Interactive tests (with AI)
    log_warning "Starting AI-powered tests (these may be slow or rate-limited)..."
    echo ""
    
    # Basic functionality tests
    test_basic_prompt || true
    sleep 5  # Rate limit buffer
    
    test_login_prompt || true
    sleep 5
    
    test_shorthand_prompt || true
    sleep 5
    
    # File-based tests
    test_yaml_file || true
    sleep 5
    
    test_login_yaml || true
    sleep 5
    
    # External app test
    test_external_app || true
}

# ============================================================================
# Final Report
# ============================================================================

print_final_report() {
    echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}Test Suite Complete${NC}"
    echo -e "${MAGENTA}════════════════════════════════════════════════════════════════${NC}\n"
    
    echo "Finished: $(date)" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    TOTAL=$((PASSED + FAILED + SKIPPED))
    
    echo -e "${GREEN}✅ Passed:  $PASSED${NC}"
    echo -e "${RED}❌ Failed:  $FAILED${NC}"
    echo -e "${YELLOW}⏭️  Skipped: $SKIPPED${NC}"
    echo -e "${BLUE}📊 Total:   $TOTAL${NC}"
    
    echo "" | tee -a "$REPORT_FILE"
    echo "Test Results Summary:" >> "$REPORT_FILE"
    echo "  Passed:  $PASSED" >> "$REPORT_FILE"
    echo "  Failed:  $FAILED" >> "$REPORT_FILE"
    echo "  Skipped: $SKIPPED" >> "$REPORT_FILE"
    echo "  Total:   $TOTAL" >> "$REPORT_FILE"
    
    echo ""
    log_info "Full report saved to: $REPORT_FILE"
    echo ""
    
    if [ $FAILED -gt 0 ]; then
        log_warning "Some tests failed. Review the report for details."
        exit 1
    else
        log_success "All tests passed!"
        exit 0
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    # Change to testdriver-proxy directory if not already there
    if [ -f "../testdriver-proxy/package.json" ]; then
        cd testdriver-proxy
    fi
    
    run_test_suite
    print_final_report
}

# Trap errors and cleanup
trap 'log_error "Script interrupted or failed"; exit 1' ERR INT TERM

# Run main function
main "$@"

