#!/bin/bash

# ========================================================================
# TestDriver Proxy - One-Command Validation & Startup
# ========================================================================
# This script starts everything needed for PR validation:
# - Proxy server
# - Test UI application
# - Validation dashboard
# - Health checks
# ========================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ports
PROXY_PORT=8080
TEST_APP_PORT=4000
DASHBOARD_PORT=5000

# Process IDs
PROXY_PID=""
TEST_APP_PID=""
DASHBOARD_PID=""

# ========================================================================
# Helper Functions
# ========================================================================

print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Cleanup function
cleanup() {
    echo ""
    print_header "Shutting Down Services"
    
    if [ ! -z "$PROXY_PID" ]; then
        print_info "Stopping proxy server (PID: $PROXY_PID)..."
        kill $PROXY_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$TEST_APP_PID" ]; then
        print_info "Stopping test app (PID: $TEST_APP_PID)..."
        kill $TEST_APP_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$DASHBOARD_PID" ]; then
        print_info "Stopping dashboard (PID: $DASHBOARD_PID)..."
        kill $DASHBOARD_PID 2>/dev/null || true
    fi
    
    # Kill any remaining processes on our ports
    lsof -ti:$PROXY_PORT,$TEST_APP_PORT,$DASHBOARD_PORT | xargs kill -9 2>/dev/null || true
    
    print_success "All services stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# ========================================================================
# Pre-flight Checks
# ========================================================================

print_header "Pre-flight Checks"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi
print_success "Node.js found: $(node --version)"

# Check if .env exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Copying from .env.example..."
    cp .env.example .env
    print_info "Please edit .env with your API credentials before continuing."
    print_info "Press Enter when ready..."
    read
fi
print_success ".env file exists"

# Check if node_modules exists
if [ ! -d node_modules ]; then
    print_info "Installing dependencies..."
    npm install
fi
print_success "Dependencies installed"

# Clear any processes on our ports
print_info "Clearing ports $PROXY_PORT, $TEST_APP_PORT, $DASHBOARD_PORT..."
lsof -ti:$PROXY_PORT,$TEST_APP_PORT,$DASHBOARD_PORT | xargs kill -9 2>/dev/null || true
print_success "Ports cleared"

# ========================================================================
# Start Services
# ========================================================================

print_header "Starting Services"

# Start Test UI Application
print_info "Starting Test UI Application on port $TEST_APP_PORT..."
cd tests/ui/test-app
node server.js > /tmp/test-app.log 2>&1 &
TEST_APP_PID=$!
cd ../../..
sleep 2

if kill -0 $TEST_APP_PID 2>/dev/null; then
    print_success "Test UI running at http://localhost:$TEST_APP_PORT"
else
    print_error "Failed to start Test UI"
    cat /tmp/test-app.log
    exit 1
fi

# Start Proxy Server
print_info "Starting Proxy Server on port $PROXY_PORT..."
node server.js > /tmp/proxy.log 2>&1 &
PROXY_PID=$!
sleep 3

if kill -0 $PROXY_PID 2>/dev/null; then
    print_success "Proxy Server running at http://localhost:$PROXY_PORT"
else
    print_error "Failed to start Proxy Server"
    cat /tmp/proxy.log
    exit 1
fi

# Start Validation Dashboard
print_info "Starting Validation Dashboard on port $DASHBOARD_PORT..."
cd tests/validation-dashboard
node dashboard-server.js > /tmp/dashboard.log 2>&1 &
DASHBOARD_PID=$!
cd ../..
sleep 2

if kill -0 $DASHBOARD_PID 2>/dev/null; then
    print_success "Validation Dashboard running at http://localhost:$DASHBOARD_PORT"
else
    print_error "Failed to start Validation Dashboard"
    cat /tmp/dashboard.log
    exit 1
fi

# ========================================================================
# Health Checks
# ========================================================================

print_header "Running Health Checks"

# Check Test App
if curl -s http://localhost:$TEST_APP_PORT > /dev/null 2>&1; then
    print_success "Test UI is responding"
else
    print_error "Test UI is not responding"
fi

# Check Proxy
if curl -s http://localhost:$PROXY_PORT/health > /dev/null 2>&1; then
    print_success "Proxy Server is responding"
else
    print_error "Proxy Server is not responding"
fi

# Check Dashboard
if curl -s http://localhost:$DASHBOARD_PORT > /dev/null 2>&1; then
    print_success "Validation Dashboard is responding"
else
    print_error "Validation Dashboard is not responding"
fi

# ========================================================================
# Display URLs
# ========================================================================

print_header "🎉 All Services Running!"

echo ""
echo -e "${GREEN}┌─────────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│                   📊 ACCESS POINTS                      │${NC}"
echo -e "${GREEN}├─────────────────────────────────────────────────────────┤${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  🎨 Validation Dashboard:                               │${NC}"
echo -e "${GREEN}│     ${CYAN}http://localhost:$DASHBOARD_PORT${GREEN}                          │${NC}"
echo -e "${GREEN}│     ${YELLOW}← Start here for PR validation!${GREEN}                 │${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  🧪 Test Application:                                   │${NC}"
echo -e "${GREEN}│     ${CYAN}http://localhost:$TEST_APP_PORT${GREEN}                           │${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  🔌 Proxy Server:                                       │${NC}"
echo -e "${GREEN}│     ${CYAN}http://localhost:$PROXY_PORT${GREEN}                           │${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}└─────────────────────────────────────────────────────────┘${NC}"
echo ""

print_info "Test Credentials:"
echo "  📧 Email: demo@testdriver.ai"
echo "  🔑 Password: TestPass123!"
echo ""

print_info "Press Ctrl+C to stop all services"
echo ""

# ========================================================================
# Keep Running
# ========================================================================

# Wait for all processes
wait $PROXY_PID $TEST_APP_PID $DASHBOARD_PID

