# Chat Provider Testing Framework 🤖

Self-healing automated testing framework for chat providers with captcha handling, selector auto-correction, and YAML config generation.

## 🌟 Features

- ✅ **Automatic Captcha Detection** - Detects and pauses for manual captcha solving
- ✅ **Selector Auto-Correction** - Tries multiple selectors and learns which ones work
- ✅ **Authentication Retry Logic** - Handles login flows with intelligent retries
- ✅ **Timeout Management** - Adjusts timeouts for slow-loading sites
- ✅ **YAML Config Generation** - Automatically generates working configs
- ✅ **Screenshot Debugging** - Captures screenshots at each step
- ✅ **Comprehensive Reporting** - JSON and Markdown reports

## 🚀 Quick Start

### Install Dependencies

```bash
cd testdriver-proxy
npm install
```

### Test a Single Provider

```bash
# Test K2Think (works without captcha)
npm run test:chat:provider k2think

# Test Grok (works without captcha)
npm run test:chat:provider grok

# Test Qwen (may have captcha)
npm run test:chat:provider qwen

# Test Mistral (may have captcha)
npm run test:chat:provider mistral

# Test Deepseek (slow loading)
npm run test:chat:provider deepseek

# Test Z.ai (requires auth, may have captcha)
npm run test:chat:provider zai
```

### Test All Providers

```bash
# Sequential (safer, easier to debug)
npm run test:chat

# Parallel (faster but harder to debug)
npm run test:chat:parallel

# Test specific providers
node tests/chat-providers/run-all-providers.js --providers=k2think,grok
```

## 📋 How It Works

### 1. Captcha Handling

The framework automatically detects captchas using multiple selectors:

```javascript
captcha: {
  selectors: [
    'iframe[src*="captcha"]', 
    '#captcha', 
    '.captcha-box',
    '[class*="recaptcha"]'
  ],
  enabled: true
}
```

**When captcha is detected:**
1. Browser pauses and shows warning
2. User has 2 minutes to solve it
3. Framework checks every 2 seconds if captcha is gone
4. Once solved, test continues automatically

### 2. Selector Auto-Correction

Each element has multiple fallback selectors:

```javascript
selectors: {
  messageInput: [
    'textarea[placeholder*="Message"]',  // Try first
    'textarea',                          // Fallback 1
    'input[type="text"]',               // Fallback 2
    '[contenteditable="true"]'          // Fallback 3
  ]
}
```

**If a selector fails:**
- Tries next selector in list
- Logs which one works
- Saves successful selector to YAML config

### 3. YAML Config Generation

After each test (success or failure), generates a YAML config:

```yaml
# qwen-config.yaml
name: qwen
url: https://chat.qwen.ai/

credentials:
  email: developer@pixelium.uk
  password: "[REDACTED]"

selectors:
  # Verified working selectors
  email: "input[type="email"]"
  messageInput: "textarea[placeholder*="Message"]"
  response: ".message-content"

captcha:
  enabled: true
  selectors:
    - "iframe[src*='captcha']"
    - "#captcha"

settings:
  slowLoad: false
  requiresAuth: true
  timeout: 60000
```

## 📊 Test Results

### Location

All results saved to: `/tmp/chat-provider-test-results/`

### Files Generated

```
/tmp/chat-provider-test-results/
├── test-report.json           # Machine-readable full report
├── test-report.md             # Human-readable summary
├── k2think-config.yaml        # Generated config for K2Think
├── k2think-selectors.json     # Successful selectors only
└── screenshots/
    ├── k2think-01-initial.png
    ├── k2think-02-email-filled.png
    ├── k2think-captcha-detected.png  # If captcha found
    └── k2think-07-response-received.png
```

### Example Report

```markdown
# Chat Provider Test Report

**Generated:** 2025-01-15T10:30:00Z
**Mode:** sequential

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total Providers | 6 |
| ✅ Passed | 4 |
| ❌ Failed | 2 |
| Pass Rate | 66.7% |

## ✅ Successful Tests (4)

### K2Think
- **Duration:** 12.5s
- **Response:** I am K2-Think, an AI assistant developed by MBZUAI...
- **Working Selectors:**
  - `email`: `input[type="email"]`
  - `messageInput`: `textarea`
  - `response`: `.message.assistant`

### Grok
- **Duration:** 10.2s
- **Response:** I am Grok 4, built by xAI...

## ❌ Failed Tests (2)

### Deepseek
- **Error:** Timeout 30000ms exceeded
- **Duration:** 30.1s

### Z.ai
- **Error:** Message input not found
- **Partially Working Selectors:**
  - `email`: `input[placeholder*="email"]`
  - `password`: `input[type="password"]`

## 🔧 Recommendations

### Failures Detected

**Deepseek:**
- Site may be slow - consider increasing timeout
- Try enabling `slowLoad: true` in configuration

**Z.ai:**
- Selector issues detected
- Review page structure and update selectors
- Check browser screenshots in /tmp/chat-provider-test-results
```

## 🎯 Test Cases Covered

### Login Flow
1. Navigate to provider URL
2. Detect and handle pre-login captcha
3. Find and fill email field
4. Find and fill password field
5. Detect and handle pre-submit captcha
6. Click login button
7. Wait for login completion
8. Detect and handle post-login captcha

### Message Flow
1. Find message input field
2. Type test message
3. Find and click send button
4. Wait for AI response
5. Extract response text
6. Verify response is not empty

### Error Handling
1. Take screenshots on all errors
2. Generate partial YAML config even on failure
3. Log all attempted selectors
4. Provide specific error messages

## 🐛 Debugging

### Enable Verbose Logging

Edit `chat-provider-test.js`:

```javascript
const CONFIG = {
    headless: false,  // Show browser (already false)
    slowMo: 100,      // Increase slow-mo delay
    timeout: 90000,   // Increase timeout
};
```

### Check Screenshots

```bash
# View screenshots
ls -lh /tmp/chat-provider-screenshots/

# View with image viewer
eog /tmp/chat-provider-screenshots/qwen-*.png
```

### Review Logs

All actions are logged with timestamps:

```
[2025-01-15T10:30:00.000Z] [INFO] 🚀 Starting test for Qwen
[2025-01-15T10:30:01.234Z] [INFO] Navigating to https://chat.qwen.ai/
[2025-01-15T10:30:03.456Z] [INFO] Screenshot saved: /tmp/.../qwen-01-initial.png
[2025-01-15T10:30:03.789Z] [WARN] ⚠️  CAPTCHA DETECTED using selector: iframe[src*="captcha"]
[2025-01-15T10:30:03.790Z] [WARN] ⏸️  Waiting for manual captcha solution...
[2025-01-15T10:30:25.123Z] [SUCCESS] ✅ Captcha solved! Continuing...
```

## 🔧 Configuration

### Add New Provider

Edit `chat-provider-test.js`:

```javascript
const PROVIDERS = {
    newprovider: {
        name: 'New Provider',
        url: 'https://newprovider.com/',
        credentials: { 
            email: 'test@example.com', 
            password: 'password123' 
        },
        selectors: {
            email: ['input[type="email"]'],
            password: ['input[type="password"]'],
            loginButton: ['button[type="submit"]'],
            messageInput: ['textarea'],
            sendButton: ['button:has-text("Send")'],
            response: ['.message-response']
        },
        captcha: {
            selectors: ['iframe[src*="captcha"]'],
            enabled: true  // Set to false if no captcha
        },
        slowLoad: false,      // Set true for slow sites
        requiresAuth: true    // Set false if no login needed
    }
};
```

### Adjust Timeouts

```javascript
const CONFIG = {
    timeout: 60000,        // Default timeout (60s)
    captchaWait: 120000,   // Captcha solving time (2min)
    screenshotDir: '/tmp/chat-provider-screenshots'
};
```

## 📝 Common Issues

### Issue: Captcha Timeout

**Problem:** Captcha not solved in 2 minutes

**Solution:** 
- Increase `captchaWait` timeout
- Use captcha solving service (future enhancement)
- Disable captcha-protected tests in CI/CD

### Issue: Selector Not Found

**Problem:** All selectors fail

**Solution:**
1. Check screenshots to see actual page state
2. Inspect page in browser devtools
3. Add new selector to fallback list
4. Update provider config

### Issue: Site Too Slow

**Problem:** Timeout before page loads

**Solution:**
```javascript
deepseek: {
    // ...
    slowLoad: true,  // Enable extended timeouts
    // ...
}
```

### Issue: Response Extraction Failed

**Problem:** Response element found but text is wrong

**Solution:**
1. Check screenshot `*-response-received.png`
2. Inspect actual response element
3. Update `response` selector to be more specific
4. Avoid CSS/HTML content selectors

## 🎬 Example Run

```bash
$ npm run test:chat:provider qwen

🚀 Starting test for Qwen
Navigating to https://chat.qwen.ai/
Screenshot saved: /tmp/.../qwen-01-initial.png
⚠️  CAPTCHA DETECTED using selector: iframe[src*="captcha"]
⏸️  Waiting for manual captcha solution...
Please solve the captcha in the browser window.
You have 2 minutes. The test will continue automatically.

[User solves captcha in browser]

✅ Captcha solved! Continuing...
Screenshot saved: /tmp/.../qwen-captcha-solved.png
Starting login process...
Trying 3 selector(s) for email
  Attempt 1/3: input[type="email"]
  ✅ Found using: input[type="email"]
Entered email: developer@pixelium.uk
Screenshot saved: /tmp/.../qwen-02-email-filled.png
Trying 3 selector(s) for password
  Attempt 1/3: input[type="password"]
  ✅ Found using: input[type="password"]
Entered password
Screenshot saved: /tmp/.../qwen-03-password-filled.png
Trying 3 selector(s) for loginButton
  Attempt 1/3: button[type="submit"]
  ✅ Clicked using: button[type="submit"]
Clicked login button
✅ Login completed successfully
Sending test message: "What model are you?"
Trying 4 selector(s) for messageInput
  Attempt 1/4: textarea[placeholder*="Message"]
  ✅ Found using: textarea[placeholder*="Message"]
Typed message
Screenshot saved: /tmp/.../qwen-05-message-typed.png
Trying 3 selector(s) for sendButton
  Attempt 1/3: button[aria-label="Send"]
  ✅ Clicked using: button[aria-label="Send"]
Clicked send button
Screenshot saved: /tmp/.../qwen-06-message-sent.png
Waiting for AI response...
Trying 4 selector(s) for response
  Attempt 1/4: .message-content
  ✅ Found using: .message-content
Screenshot saved: /tmp/.../qwen-07-response-received.png
Response received: I am Qwen, a large language model created by Alibaba Cloud...
✅ YAML config saved: /tmp/.../qwen-config.yaml
✅ Test PASSED for Qwen

============================================================
TEST SUMMARY
============================================================
{
  "success": true,
  "provider": "qwen",
  "response": "I am Qwen, a large language model...",
  "selectors": {
    "email": "input[type=\"email\"]",
    "password": "input[type=\"password\"]",
    "loginButton": "button[type=\"submit\"]",
    "messageInput": "textarea[placeholder*=\"Message\"]",
    "sendButton": "button[aria-label=\"Send\"]",
    "response": ".message-content"
  },
  "duration": "18.45"
}
============================================================
```

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
name: Chat Provider Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd testdriver-proxy
          npm install
      
      - name: Run K2Think test (no captcha)
        run: npm run test:chat:provider k2think
        env:
          CI: true
      
      - name: Run Grok test (no captcha)
        run: npm run test:chat:provider grok
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: /tmp/chat-provider-test-results/
```

## 📚 Further Reading

- [Puppeteer Documentation](https://pptr.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [TestDriver.ai Documentation](https://testdriver.ai/)

## 🤝 Contributing

1. Fork the repository
2. Add new provider configurations
3. Test your changes
4. Submit a pull request

## 📄 License

MIT License - See parent project for details

---

**Built with ❤️ for automated testing**

