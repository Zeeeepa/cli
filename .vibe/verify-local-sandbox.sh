#!/bin/bash
# Verification script for local sandbox integration

set -e

echo "🔍 Verifying Local Sandbox Integration..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counter
checks_passed=0
checks_total=0

check() {
  checks_total=$((checks_total + 1))
  if eval "$1"; then
    echo -e "${GREEN}✓${NC} $2"
    checks_passed=$((checks_passed + 1))
    return 0
  else
    echo -e "${RED}✗${NC} $2"
    return 1
  fi
}

echo "📦 Checking Dependencies..."
check "test -f package.json" "package.json exists"
check "grep -q '@anthropic-ai/sandbox-runtime' package.json" "sandbox-runtime in dependencies"
check "grep -q '\"build\"' package.json" "build script exists"
check "grep -q '\"testui\"' package.json" "testui script exists"

echo ""
echo "📁 Checking Files..."
check "test -f testdriver-proxy/sandbox-config.js" "sandbox-config.js exists"
check "test -f testdriver-proxy/lib/LocalSandboxManager.js" "LocalSandboxManager.js exists"
check "test -f testdriver-proxy/lib/chrome-finder.js" "chrome-finder.js exists"
check "test -f testdriver-proxy/bin/testui" "testui binary exists"
check "test -x testdriver-proxy/bin/testui" "testui is executable"
check "test -f LOCAL_SANDBOX_SETUP.md" "documentation exists"

echo ""
echo "🔧 Checking Code Integration..."
check "grep -q 'USE_LOCAL_SANDBOX' testdriver-proxy/bin/testui" "testui uses local sandbox flag"
check "grep -q 'getSandboxManager' testdriver-proxy/bin/testui" "testui imports SandboxManager"
check "grep -q 'LocalSandboxStub' agent/lib/sandbox.js" "sandbox.js has local mode"
check "grep -q 'findChromeOrFail' testdriver-proxy/lib/chrome-finder.js" "chrome-finder has main function"

echo ""
echo "🌐 Checking Configuration..."
check "grep -q 'allowWrite' testdriver-proxy/sandbox-config.js" "filesystem config exists"
check "grep -q 'allowedDomains' testdriver-proxy/sandbox-config.js" "network config exists"
check "grep -q 'localhost' testdriver-proxy/sandbox-config.js" "localhost allowed by default"

echo ""
echo "🎯 Checking Platform Support..."
PLATFORM=$(uname -s)

if [ "$PLATFORM" = "Darwin" ]; then
  echo "   Platform: macOS"
  check "which sandbox-exec > /dev/null 2>&1" "sandbox-exec available (macOS)"
elif [ "$PLATFORM" = "Linux" ]; then
  echo "   Platform: Linux"
  if which bwrap > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} bubblewrap installed"
    checks_passed=$((checks_passed + 1))
  else
    echo -e "${YELLOW}⚠${NC}  bubblewrap not installed (run: sudo apt install bubblewrap)"
  fi
  checks_total=$((checks_total + 1))
fi

echo ""
echo "🌍 Checking Chrome/Chromium..."
if which google-chrome > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} google-chrome found"
  checks_passed=$((checks_passed + 1))
elif which chromium > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} chromium found"
  checks_passed=$((checks_passed + 1))
elif which chromium-browser > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} chromium-browser found"
  checks_passed=$((checks_passed + 1))
elif [ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
  echo -e "${GREEN}✓${NC} Chrome found (macOS)"
  checks_passed=$((checks_passed + 1))
else
  echo -e "${YELLOW}⚠${NC}  Chrome/Chromium not found"
  echo "   Install: brew install --cask google-chrome (macOS)"
  echo "   Install: sudo apt install chromium-browser (Linux)"
fi
checks_total=$((checks_total + 1))

echo ""
echo "🔐 Checking Environment..."
if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo -e "${GREEN}✓${NC} ANTHROPIC_API_KEY is set"
  checks_passed=$((checks_passed + 1))
else
  echo -e "${YELLOW}⚠${NC}  ANTHROPIC_API_KEY not set"
  echo "   Set with: export ANTHROPIC_API_KEY='your-key'"
fi
checks_total=$((checks_total + 1))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $checks_passed -eq $checks_total ]; then
  echo -e "${GREEN}✅ All checks passed!${NC} ($checks_passed/$checks_total)"
  echo ""
  echo "🚀 Ready to test:"
  echo "   npm run testui \"visit localhost:8080\""
  echo ""
  exit 0
elif [ $checks_passed -ge $((checks_total * 3 / 4)) ]; then
  echo -e "${YELLOW}⚠️  Most checks passed${NC} ($checks_passed/$checks_total)"
  echo ""
  echo "Review warnings above before testing."
  echo ""
  exit 0
else
  echo -e "${RED}❌ Some checks failed${NC} ($checks_passed/$checks_total)"
  echo ""
  echo "Fix issues above before testing."
  echo ""
  exit 1
fi

