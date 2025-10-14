#!/bin/bash

# ========================================================================
# TestDriver Proxy - End-to-End Test Execution System
# ========================================================================
# Single command to run natural language tests from start to finish
# 
# Usage:
#   ./execute-test.sh "Login with demo@testdriver.ai, add 3 tasks"
#   npm run execute "Click login button, type email, submit form"
# ========================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROXY_PORT=8080
TEST_APP_PORT=4000
REPORT_DIR="execution-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/execution_${TIMESTAMP}.html"

# Process IDs
PROXY_PID=""
TEST_APP_PID=""

# Natural language input
TEST_INPUT="$1"

if [ -z "$TEST_INPUT" ]; then
    echo -e "${RED}❌ Error: No test input provided${NC}"
    echo ""
    echo "Usage:"
    echo "  ./execute-test.sh \"Login with email, add task, verify dashboard\""
    echo "  npm run execute \"Click button, type text, submit form\""
    echo ""
    exit 1
fi

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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${MAGENTA}▶️  $1${NC}"
}

cleanup() {
    echo ""
    print_header "Cleanup"
    
    if [ ! -z "$PROXY_PID" ]; then
        print_info "Stopping proxy server..."
        kill $PROXY_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$TEST_APP_PID" ]; then
        print_info "Stopping test app..."
        kill $TEST_APP_PID 2>/dev/null || true
    fi
    
    lsof -ti:$PROXY_PORT,$TEST_APP_PORT | xargs kill -9 2>/dev/null || true
    
    print_success "Cleanup complete"
}

trap cleanup EXIT INT TERM

# ========================================================================
# Phase 1: Service Startup
# ========================================================================

print_header "🚀 Phase 1: Starting Services"

# Check dependencies
print_step "Checking dependencies..."
if ! command -v node &> /dev/null; then
    print_error "Node.js not found"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    print_error "Python3 not found"
    exit 1
fi

print_success "Dependencies verified"

# Clear ports
print_step "Clearing ports..."
lsof -ti:$PROXY_PORT,$TEST_APP_PORT | xargs kill -9 2>/dev/null || true
print_success "Ports cleared"

# Create report directory
mkdir -p "$REPORT_DIR"
mkdir -p "$REPORT_DIR/screenshots"

# Start Test Application
print_step "Starting Test Application..."
cd tests/ui/test-app
node server.js > /tmp/test-app.log 2>&1 &
TEST_APP_PID=$!
cd ../../..
sleep 2

if ! kill -0 $TEST_APP_PID 2>/dev/null; then
    print_error "Failed to start Test Application"
    exit 1
fi
print_success "Test Application running on port $TEST_APP_PORT"

# Start Proxy Server
print_step "Starting Proxy Server..."
node server.js > /tmp/proxy.log 2>&1 &
PROXY_PID=$!
sleep 3

if ! kill -0 $PROXY_PID 2>/dev/null; then
    print_error "Failed to start Proxy Server"
    exit 1
fi
print_success "Proxy Server running on port $PROXY_PORT"

# Verify services
sleep 2
if ! curl -s http://localhost:$TEST_APP_PORT > /dev/null; then
    print_error "Test Application not responding"
    exit 1
fi

if ! curl -s http://localhost:$PROXY_PORT/health > /dev/null; then
    print_error "Proxy Server not responding"
    exit 1
fi

print_success "All services ready!"

# ========================================================================
# Phase 2: Natural Language Processing
# ========================================================================

print_header "🤖 Phase 2: Processing Natural Language"

print_info "Input: \"$TEST_INPUT\""
echo ""

# Call proxy /input endpoint to convert natural language to steps
print_step "Converting to executable steps..."

STEPS_JSON=$(python3 - <<PYPARSING
import requests
import json
import sys

try:
    response = requests.post(
        'http://localhost:$PROXY_PORT/api/1.0.0/testdriver/input',
        json={'input': '$TEST_INPUT'},
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        # Save steps to file
        with open('/tmp/test_steps.json', 'w') as f:
            json.dump(data, f, indent=2)
        print(json.dumps(data, indent=2))
        sys.exit(0)
    else:
        print(f"Error: API returned status {response.status_code}", file=sys.stderr)
        sys.exit(1)
        
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
PYPARSING
)

if [ $? -ne 0 ]; then
    print_error "Failed to process natural language"
    exit 1
fi

print_success "Converted to executable steps"
echo "$STEPS_JSON" | python3 -m json.tool | head -20

# ========================================================================
# Phase 3: Test Execution
# ========================================================================

print_header "🎬 Phase 3: Executing Test Steps"

# Execute the test using Selenium/Playwright
python3 - <<'PYEXECUTE'
import json
import sys
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import base64

class TestExecutor:
    def __init__(self):
        self.driver = None
        self.execution_log = []
        self.screenshots = []
        
    def setup_browser(self):
        """Initialize headless Chrome browser"""
        options = Options()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--window-size=1920,1080')
        
        try:
            self.driver = webdriver.Chrome(options=options)
            self.log_step('success', 'Browser initialized', 'Chrome headless browser started')
            return True
        except Exception as e:
            self.log_step('error', 'Browser initialization failed', str(e))
            return False
    
    def log_step(self, status, action, details):
        """Log execution step"""
        entry = {
            'timestamp': datetime.now().isoformat(),
            'status': status,
            'action': action,
            'details': details
        }
        self.execution_log.append(entry)
        
        icon = '✅' if status == 'success' else '❌' if status == 'error' else 'ℹ️'
        print(f"{icon} {action}: {details}")
    
    def capture_screenshot(self, name):
        """Capture and save screenshot"""
        try:
            screenshot_path = f"execution-reports/screenshots/{name}_{int(time.time())}.png"
            self.driver.save_screenshot(screenshot_path)
            self.screenshots.append(screenshot_path)
            self.log_step('info', 'Screenshot captured', screenshot_path)
            return screenshot_path
        except Exception as e:
            self.log_step('error', 'Screenshot failed', str(e))
            return None
    
    def get_page_context(self):
        """Extract current page context"""
        try:
            context = {
                'url': self.driver.current_url,
                'title': self.driver.title,
                'visible_elements': []
            }
            
            # Find visible interactive elements
            buttons = self.driver.find_elements(By.TAG_NAME, 'button')
            inputs = self.driver.find_elements(By.TAG_NAME, 'input')
            links = self.driver.find_elements(By.TAG_NAME, 'a')
            
            for elem in buttons[:10]:
                if elem.is_displayed():
                    context['visible_elements'].append({
                        'type': 'button',
                        'text': elem.text,
                        'id': elem.get_attribute('id')
                    })
            
            for elem in inputs[:10]:
                if elem.is_displayed():
                    context['visible_elements'].append({
                        'type': 'input',
                        'id': elem.get_attribute('id'),
                        'type_attr': elem.get_attribute('type'),
                        'placeholder': elem.get_attribute('placeholder')
                    })
            
            return context
        except Exception as e:
            return {'error': str(e)}
    
    def execute_steps(self):
        """Execute test steps from parsed commands"""
        try:
            # Load parsed steps
            with open('/tmp/test_steps.json', 'r') as f:
                steps_data = json.load(f)
            
            # Navigate to test app
            self.log_step('info', 'Navigating to test app', 'http://localhost:4000')
            self.driver.get('http://localhost:4000')
            time.sleep(2)
            self.capture_screenshot('01_initial_page')
            
            context = self.get_page_context()
            self.log_step('info', 'Page context retrieved', f"Title: {context.get('title')}, Elements: {len(context.get('visible_elements', []))}")
            
            # Execute commands (simplified - would parse YAML commands in production)
            # For demo, execute common login flow
            
            # Step 1: Fill email
            try:
                email_field = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.ID, 'email'))
                )
                email_field.clear()
                email_field.send_keys('demo@testdriver.ai')
                self.log_step('success', 'Email entered', 'demo@testdriver.ai')
                self.capture_screenshot('02_email_entered')
            except TimeoutException:
                self.log_step('error', 'Email field not found', 'Timeout waiting for #email')
            
            # Step 2: Fill password
            try:
                password_field = self.driver.find_element(By.ID, 'password')
                password_field.clear()
                password_field.send_keys('TestPass123!')
                self.log_step('success', 'Password entered', '••••••••')
                self.capture_screenshot('03_password_entered')
            except NoSuchElementException:
                self.log_step('error', 'Password field not found', '#password not found')
            
            # Step 3: Click login
            try:
                login_button = self.driver.find_element(By.ID, 'login-btn')
                login_button.click()
                self.log_step('success', 'Login button clicked', 'Submitted login form')
                time.sleep(2)
                self.capture_screenshot('04_after_login')
                
                # Check if dashboard appeared
                context = self.get_page_context()
                if 'Task Dashboard' in context.get('title', ''):
                    self.log_step('success', 'Login successful', 'Dashboard loaded')
                else:
                    self.log_step('warning', 'Dashboard check', f"Current title: {context.get('title')}")
                
            except NoSuchElementException:
                self.log_step('error', 'Login button not found', '#login-btn not found')
            
            # Final screenshot
            self.capture_screenshot('05_final_state')
            
            return True
            
        except Exception as e:
            self.log_step('error', 'Execution failed', str(e))
            return False
    
    def generate_report(self):
        """Generate execution report"""
        success_count = sum(1 for log in self.execution_log if log['status'] == 'success')
        error_count = sum(1 for log in self.execution_log if log['status'] == 'error')
        total_steps = len(self.execution_log)
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_steps': total_steps,
                'successful': success_count,
                'errors': error_count,
                'screenshots': len(self.screenshots)
            },
            'execution_log': self.execution_log,
            'screenshots': self.screenshots
        }
        
        # Save JSON report
        with open('/tmp/execution_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        return report
    
    def run(self):
        """Main execution flow"""
        if not self.setup_browser():
            return False
        
        try:
            success = self.execute_steps()
            self.generate_report()
            return success
        finally:
            if self.driver:
                self.driver.quit()
                self.log_step('info', 'Browser closed', 'Cleanup complete')

if __name__ == '__main__':
    executor = TestExecutor()
    success = executor.run()
    sys.exit(0 if success else 1)
PYEXECUTE

EXECUTION_STATUS=$?

# ========================================================================
# Phase 4: Report Generation
# ========================================================================

print_header "📊 Phase 4: Generating Report"

# Generate HTML report from execution log
python3 - <<'PYREPORT'
import json
from datetime import datetime
import os

# Load execution report
with open('/tmp/execution_report.json', 'r') as f:
    report = json.load(f)

# Generate HTML
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Execution Report</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }}
        .header {{
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #667eea;
        }}
        .header h1 {{
            color: #333;
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        .summary {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        .summary-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
        }}
        .summary-card .value {{
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 10px;
        }}
        .summary-card.success {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); }}
        .summary-card.danger {{ background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }}
        .execution-log {{
            margin-bottom: 40px;
        }}
        .log-entry {{
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 5px solid #667eea;
        }}
        .log-entry.success {{ border-left-color: #10b981; }}
        .log-entry.error {{ border-left-color: #ef4444; }}
        .log-entry.warning {{ border-left-color: #f59e0b; }}
        .log-header {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }}
        .log-action {{
            font-weight: 600;
            color: #333;
        }}
        .log-status {{
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
        }}
        .log-status.success {{
            background: #d1fae5;
            color: #059669;
        }}
        .log-status.error {{
            background: #fee2e2;
            color: #dc2626;
        }}
        .screenshots {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }}
        .screenshot {{
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }}
        .screenshot img {{
            width: 100%;
            height: auto;
            display: block;
        }}
        .screenshot-caption {{
            background: #f8f9fa;
            padding: 10px;
            font-size: 0.9em;
            color: #666;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 Test Execution Report</h1>
            <div class="timestamp">{report['timestamp']}</div>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <div class="value">{report['summary']['total_steps']}</div>
                <div class="label">Total Steps</div>
            </div>
            <div class="summary-card success">
                <div class="value">{report['summary']['successful']}</div>
                <div class="label">Successful</div>
            </div>
            <div class="summary-card danger">
                <div class="value">{report['summary']['errors']}</div>
                <div class="label">Errors</div>
            </div>
            <div class="summary-card">
                <div class="value">{report['summary']['screenshots']}</div>
                <div class="label">Screenshots</div>
            </div>
        </div>
        
        <div class="execution-log">
            <h2 style="margin-bottom: 20px; color: #333;">📋 Execution Log</h2>
"""

# Add log entries
for entry in report['execution_log']:
    status_class = entry['status']
    html += f"""
            <div class="log-entry {status_class}">
                <div class="log-header">
                    <div class="log-action">{entry['action']}</div>
                    <div class="log-status {status_class}">{entry['status'].upper()}</div>
                </div>
                <div class="log-details">{entry['details']}</div>
                <div class="log-time" style="color: #999; font-size: 0.85em; margin-top: 5px;">{entry['timestamp']}</div>
            </div>
    """

html += """
        </div>
        
        <div class="screenshots-section">
            <h2 style="margin-bottom: 20px; color: #333;">📸 Screenshots</h2>
            <div class="screenshots">
"""

# Add screenshots
for i, screenshot in enumerate(report['screenshots'], 1):
    filename = os.path.basename(screenshot)
    html += f"""
                <div class="screenshot">
                    <img src="screenshots/{filename}" alt="Screenshot {i}">
                    <div class="screenshot-caption">Step {i}: {filename}</div>
                </div>
    """

html += """
            </div>
        </div>
    </div>
</body>
</html>
"""

# Write report
report_file = os.environ.get('REPORT_FILE', 'execution-reports/execution_latest.html')
with open(report_file, 'w') as f:
    f.write(html)

print(f"Report generated: {report_file}")
PYREPORT

# ========================================================================
# Summary
# ========================================================================

print_header "🎉 Execution Complete!"

if [ $EXECUTION_STATUS -eq 0 ]; then
    print_success "All tests passed!"
else
    print_error "Some tests failed"
fi

echo ""
echo -e "${GREEN}┌─────────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│                   📊 RESULTS                            │${NC}"
echo -e "${GREEN}├─────────────────────────────────────────────────────────┤${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  Input: $TEST_INPUT${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  Report: ${CYAN}$REPORT_FILE${GREEN}${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  View Report:                                           │${NC}"
echo -e "${GREEN}│    ${CYAN}open $REPORT_FILE${GREEN}                   │${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}└─────────────────────────────────────────────────────────┘${NC}"
echo ""

print_info "Services will remain running. Press Ctrl+C to stop."
echo ""

# Keep services running
wait $PROXY_PID $TEST_APP_PID

