# 🚀 TestUI Usage Guide

TestUI is a natural language interface for browser automation and UI testing. Simply describe what you want to test, and TestUI generates and executes the test automatically!

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [How to Run Locally](#how-to-run-locally)
- [AI Agent Integration](#ai-agent-integration)
- [Real-World Examples](#real-world-examples)
- [Configuration](#configuration)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/Zeeeepa/cli.git
cd cli

# Navigate to testdriver-proxy directory
cd testdriver-proxy

# Install dependencies
npm install

# Set your API key
export ANTHROPIC_API_KEY="your-key-here"
# OR
export ANTHROPIC_AUTH_TOKEN="your-token-here"
```

### Or Test the PR Before Merge

```bash
# Clone and checkout PR #4
git clone https://github.com/Zeeeepa/cli.git
cd cli
git fetch origin pull/4/head:test-testui
git checkout test-testui

# Navigate to testdriver-proxy and install
cd testdriver-proxy
npm install

# Set your API key and test!
export ANTHROPIC_API_KEY="your-key-here"
./bin/testui "visit example.com and get the page title"
```

### Your First Test

```bash
# Test any website with natural language!
./bin/testui "visit example.com and get the page title"
```

That's it! 🎉

---

## 💻 How to Run Locally

### After PR is Merged

```bash
# Pull the latest changes
git pull origin main

# Navigate to testdriver-proxy
cd testdriver-proxy

# Install if not already done
npm install

# Set your API key
export ANTHROPIC_API_KEY="your-key-here"

# Start testing!
./bin/testui "your test instruction here"
```

### Three Usage Patterns

#### 1️⃣ Generate & Run New Test
```bash
./bin/testui "go to myapp.com, click login, and verify dashboard loads"
```

#### 2️⃣ Upgrade Existing Test
```bash
./bin/testui "upgrade ./tests/login.yaml to include error handling"
```

#### 3️⃣ Run Existing Test
```bash
./bin/testui "./tests/checkout-flow.yaml"
```

### Local Development Testing

```bash
# Start your app
npm run dev  # App runs on localhost:3000

# Test it with TestUI
./bin/testui "visit localhost:3000, click 'Sign Up', fill email with test@example.com"
```

---

## 🤖 AI Agent Integration

### Option 1: Direct CLI Usage (Simplest)

```python
import subprocess

def test_ui(instruction: str) -> str:
    """AI agent tests UI using TestUI"""
    result = subprocess.run(
        ["./bin/testui", instruction],
        cwd="/path/to/testdriver-proxy",
        capture_output=True,
        text=True,
        timeout=120
    )
    return result.stdout

# Usage
result = test_ui("visit github.com and extract star count")
print(result)
```

### Option 2: LangChain Integration

```python
from langchain.tools import Tool

def testui_tool(prompt: str) -> str:
    """Test web interfaces with natural language"""
    import subprocess
    result = subprocess.run(
        ["./bin/testui", prompt],
        capture_output=True,
        text=True
    )
    return result.stdout

# Add to agent
tools = [
    Tool(
        name="TestUI",
        func=testui_tool,
        description="Test web interfaces. Input: natural language. Output: test results."
    )
]
```

### Option 3: Custom Agent Framework

```python
class UITestingAgent:
    def __init__(self, testui_path: str):
        self.testui_path = testui_path
    
    def test_interface(self, instruction: str):
        """Execute UI test from natural language"""
        result = subprocess.run(
            [f"{self.testui_path}/bin/testui", instruction],
            capture_output=True,
            text=True
        )
        
        # Parse results
        if "✅" in result.stdout:
            return {"status": "passed", "output": result.stdout}
        else:
            return {"status": "failed", "output": result.stdout}

# Usage
agent = UITestingAgent("/path/to/testdriver-proxy")
result = agent.test_interface("test login flow")
```

---

## 🎨 Real-World Examples

### E-commerce Testing
```bash
./bin/testui "go to mystore.com, search for 'iPhone 15', add first result to cart, and verify cart shows 1 item"
```

### Form Validation
```bash
./bin/testui "visit signup.myapp.com, enter invalid email 'notanemail', submit, and check for error message"
```

### Data Extraction
```bash
./bin/testui "go to news.ycombinator.com and extract top 5 story titles with point counts"
```

### GitHub Repository Analysis
```bash
./bin/testui "visit github.com/microsoft/playwright and extract description, star count, and fork count"
```

### Wikipedia Research
```bash
./bin/testui "search wikipedia for 'artificial intelligence', click first result, extract first paragraph"
```

### Multi-Step Authentication
```bash
./bin/testui "go to app.mysite.com, enter email 'user@test.com', click continue, enter password 'pass123', submit, verify dashboard"
```

---

## 🔧 Configuration

### Environment Variables

```bash
# API Key (required - use one of these)
export ANTHROPIC_API_KEY="your-api-key"
export ANTHROPIC_AUTH_TOKEN="your-auth-token"
export API_KEY="your-key"

# Optional: Custom proxy port (default: 9876)
export TESTUI_PROXY_PORT=9999

# Optional: Custom model (default: glm-4.5V)
export MODEL="claude-3-opus-20240229"

# Optional: Base URL
export ANTHROPIC_BASE_URL="https://api.anthropic.com"
```

### Advanced Configuration

Create a `.env` file in `testdriver-proxy/`:

```bash
ANTHROPIC_API_KEY=your-key-here
TESTUI_PROXY_PORT=9876
MODEL=glm-4.5V
```

Then source it:
```bash
source .env
./bin/testui "your test here"
```

---

## 🎯 Advanced Usage

### Generate Test Without Execution

```bash
# Use timeout to stop before execution
timeout 10 ./bin/testui "generate test for login flow" > test.yaml
```

### CI/CD Integration

```yaml
# .github/workflows/ui-tests.yml
name: UI Tests
on: [push, pull_request]

jobs:
  test-ui:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Dependencies
        run: |
          cd testdriver-proxy
          npm install
      
      - name: Run UI Tests
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          cd testdriver-proxy
          ./bin/testui "test homepage loads at localhost:3000"
          ./bin/testui "test login flow works correctly"
```

### Batch Testing

```bash
# Create a test script
cat > run_tests.sh << 'EOF'
#!/bin/bash

tests=(
  "test homepage loads"
  "test search works"
  "test checkout flow"
)

for test in "${tests[@]}"; do
  echo "Running: $test"
  ./bin/testui "$test"
done
EOF

chmod +x run_tests.sh
./run_tests.sh
```

### Test Result Parsing

```python
import subprocess
import re

def parse_testui_results(output: str):
    """Parse TestUI output for pass/fail"""
    if "✅" in output and "Generated YAML" in output:
        # Extract generated steps
        yaml_match = re.search(r'Generated test steps:.*?steps:(.*?)(?=─|$)', output, re.DOTALL)
        if yaml_match:
            return {
                "status": "generated",
                "yaml": yaml_match.group(1).strip()
            }
    
    if "❌" in output:
        return {"status": "failed", "error": output}
    
    return {"status": "unknown", "output": output}

# Usage
result = subprocess.run(
    ["./bin/testui", "test something"],
    capture_output=True,
    text=True
)
parsed = parse_testui_results(result.stdout)
print(parsed)
```

---

## 🛠️ Troubleshooting

### Issue: "API key not set"
**Solution:**
```bash
export ANTHROPIC_API_KEY="your-key"
# or
export ANTHROPIC_AUTH_TOKEN="your-token"
```

### Issue: "Proxy server failed to start"
**Solution:**
```bash
# Check if port is in use
lsof -i :9876

# Use different port
export TESTUI_PROXY_PORT=9999
```

### Issue: "Module not found"
**Solution:**
```bash
cd testdriver-proxy
npm install
```

### Issue: Test takes too long
**Solution:**
```bash
# Add timeout
timeout 120 ./bin/testui "your test"

# Or reduce complexity
# Instead of: "visit site, do 10 things"
# Use: "visit site and do one thing"
```

### Issue: Generated test doesn't work
**Solution:**
- Be more specific in your instructions
- Break complex flows into smaller tests
- Use explicit URLs: `"visit https://example.com"` instead of `"go to example"`

---

## 💡 Pro Tips

### 1. Be Specific
✅ Good: `"click the blue 'Sign Up' button in the header"`  
❌ Vague: `"click signup"`

### 2. Include URLs
✅ Good: `"visit https://myapp.com/login"`  
❌ Vague: `"go to login"`

### 3. Chain Actions Clearly
✅ Good: `"type email, press Tab, type password, press Enter"`  
❌ Vague: `"fill the form and submit"`

### 4. Specify Wait Times
✅ Good: `"click submit, wait 2 seconds, verify success message"`  
❌ Missing: `"click submit, verify message"` (might be too fast)

### 5. Extract Data Explicitly
✅ Good: `"extract all h2 headings and their links"`  
❌ Vague: `"get the content"`

---

## 📊 What You Get

When you run TestUI, you receive:

1. **📝 Generated YAML** - The test specification
2. **🔍 Execution Logs** - Step-by-step results  
3. **📊 Extracted Data** - If you requested data extraction
4. **📸 Screenshots** - If test includes visual verification
5. **✅/❌ Status** - Pass/fail indication

---

## 🎯 Use Cases

| Use Case | Command Example |
|----------|----------------|
| Manual Testing | `./bin/testui "test login flow"` |
| CI/CD | Add to `.github/workflows` |
| AI Agents | Call via `subprocess.run()` |
| Data Scraping | `./bin/testui "extract pricing data"` |
| Regression Testing | Run existing `.yaml` files |
| Form Validation | Test with invalid inputs |
| Multi-step Flows | Chain multiple actions |

---

## 🚀 Ready to Start?

```bash
# 1. Install
cd testdriver-proxy && npm install

# 2. Configure
export ANTHROPIC_API_KEY="your-key"

# 3. Test!
./bin/testui "visit example.com and get title"

# 4. 🎉 You're ready!
```

---

## 📚 Additional Resources

- **TestDriver Docs:** https://docs.testdriver.ai/
- **GitHub Issues:** Report bugs or feature requests
- **Examples:** See `examples/` directory for more samples

---

## 🤝 Contributing

Found a bug or have a feature request? Please open an issue!

---

**Made with ❤️ for easy UI testing**
