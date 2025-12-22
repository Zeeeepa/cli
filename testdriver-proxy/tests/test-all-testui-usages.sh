#!/bin/bash

# Test all testui usages with Anthropic API
# This script tests the three main usage patterns of testui

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Testing All TestUI Usages${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Setup
export ANTHROPIC_API_KEY="${ANTHROPIC_AUTH_TOKEN}"
export TESTUI_PROXY_PORT=9878
TESTUI_BIN="$(dirname "$0")/../bin/testui"

echo -e "${YELLOW}Environment Setup:${NC}"
echo "  ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:0:20}..."
echo "  TESTUI_PROXY_PORT: $TESTUI_PROXY_PORT"
echo ""

# Test 1: Simple Prompt (this will try to generate and run)
echo -e "${CYAN}Test 1: Simple Prompt${NC}"
echo -e "${YELLOW}Command: testui 'navigate to google.com'${NC}"
echo ""

# Use timeout to prevent hanging
timeout 30 "$TESTUI_BIN" "navigate to google.com" 2>&1 | tee /tmp/testui-test1.log || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo -e "${RED}Test 1 timed out after 30 seconds${NC}"
  elif [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}Test 1 failed with exit code $EXIT_CODE${NC}"
  fi
  echo ""
}

echo ""
echo -e "${CYAN}========================================${NC}"
echo ""

# Test 2: Run existing YAML file
echo -e "${CYAN}Test 2: Run Existing YAML File${NC}"
echo -e "${YELLOW}Command: testui --file='tests/simple-test.yaml'${NC}"
echo ""

timeout 30 "$TESTUI_BIN" --file="$(dirname "$0")/simple-test.yaml" 2>&1 | tee /tmp/testui-test2.log || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo -e "${RED}Test 2 timed out after 30 seconds${NC}"
  elif [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}Test 2 failed with exit code $EXIT_CODE${NC}"
  fi
  echo ""
}

echo ""
echo -e "${CYAN}========================================${NC}"
echo ""

# Test 3: Enhance existing YAML with prompt
echo -e "${CYAN}Test 3: Enhance Existing YAML with Prompt${NC}"
echo -e "${YELLOW}Command: testui --file='tests/simple-test.yaml' --prompt='also search for AI'${NC}"
echo ""

timeout 30 "$TESTUI_BIN" --file="$(dirname "$0")/simple-test.yaml" --prompt="also search for AI" 2>&1 | tee /tmp/testui-test3.log || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo -e "${RED}Test 3 timed out after 30 seconds${NC}"
  elif [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}Test 3 failed with exit code $EXIT_CODE${NC}"
  fi
  echo ""
}

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}All tests completed!${NC}"
echo ""
echo -e "${YELLOW}Test logs saved to:${NC}"
echo "  /tmp/testui-test1.log"
echo "  /tmp/testui-test2.log"
echo "  /tmp/testui-test3.log"
echo ""

