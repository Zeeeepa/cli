# Quick Start Guide 🚀

Get started testing chat providers in 5 minutes!

## Step 1: Install Dependencies (2 min)

```bash
cd testdriver-proxy
npm install
```

This installs:
- `puppeteer` - Browser automation
- `express` - Server framework  
- All other dependencies

## Step 2: Test a Provider Without Captcha (2 min)

### Test K2Think (Most Reliable)

```bash
npm run test:chat:provider k2think
```

Expected output:
```
🚀 Starting test for K2Think
Navigating to https://www.k2think.ai/
✅ Login completed successfully  
✅ Response received: I am K2-Think...
✅ Test PASSED
```

### Test Grok (Also Reliable)

```bash
npm run test:chat:provider grok
```

## Step 3: Test a Provider With Captcha (3-5 min)

### Test Qwen (May Have Captcha)

```bash
npm run test:chat:provider qwen
```

If captcha appears:
1. ⏸️  Browser will pause automatically
2. 🧩 Solve the captcha manually in the browser
3. ✅ Test continues automatically when solved
4. ⏱️  You have 2 minutes

## Step 4: View Results

```bash
# View screenshots
ls /tmp/chat-provider-screenshots/

# View report
cat /tmp/chat-provider-test-results/test-report.md

# View generated YAML config
cat /tmp/chat-provider-test-results/k2think-config.yaml
```

## 🎯 What Just Happened?

The test framework:
1. ✅ Opened a browser to the chat provider
2. ✅ Detected if captcha was present
3. ✅ Filled in login credentials automatically
4. ✅ Sent a test message "What model are you?"
5. ✅ Extracted the AI's response
6. ✅ Generated a YAML config with working selectors
7. ✅ Took screenshots at each step

## 📊 Understanding Results

### Success ✅

```json
{
  "success": true,
  "provider": "k2think",
  "response": "I am K2-Think, an AI assistant...",
  "selectors": {
    "email": "input[type=\"email\"]",
    "messageInput": "textarea",
    "response": ".message.assistant"
  },
  "duration": "12.5"
}
```

**What this means:**
- ✅ Login worked
- ✅ Message sent successfully
- ✅ Response extracted correctly
- ✅ These selectors work and are saved to YAML

### Failure ❌

```json
{
  "success": false,
  "provider": "deepseek",
  "error": "Timeout 30000ms exceeded",
  "selectors": {
    "email": "input[type=\"email\"]",
    "password": "input[type=\"password\"]"
  }
}
```

**What this means:**
- ❌ Test failed at some point
- ⚠️  Some selectors worked (email, password)
- 🐛 Check screenshots to see what went wrong
- 💡 Error message gives clue ("Timeout" = site too slow)

## 🔧 Common Scenarios

### Scenario 1: Everything Works

```bash
$ npm run test:chat:provider k2think

✅ Test PASSED
Response: I am K2-Think...
Config saved to: /tmp/.../k2think-config.yaml
```

**What to do:** Nothing! Use the generated YAML config.

### Scenario 2: Captcha Appears

```bash
$ npm run test:chat:provider qwen

⚠️  CAPTCHA DETECTED
⏸️  Waiting for manual solution...
Please solve the captcha in the browser.
```

**What to do:**
1. Look at the browser window that opened
2. Solve the captcha (click images, check boxes, etc.)
3. Wait for "✅ Captcha solved!" message
4. Test continues automatically

### Scenario 3: Selector Failed

```bash
$ npm run test:chat:provider mistral

❌ Test FAILED: Could not find messageInput
Check screenshots: /tmp/.../mistral-failed-messageInput.png
```

**What to do:**
1. Open the screenshot
2. See what the actual page looks like
3. Add better selector to `PROVIDERS` config
4. Run test again

### Scenario 4: Timeout

```bash
$ npm run test:chat:provider deepseek

❌ Test FAILED: Timeout 30000ms exceeded
```

**What to do:**
Edit `chat-provider-test.js`:

```javascript
deepseek: {
    // ...
    slowLoad: true,  // Add this line
    // ...
}
```

Then run again.

## 🎓 Next Steps

### Test All Providers

```bash
# Sequential (one at a time)
npm run test:chat

# Parallel (all at once)
npm run test:chat:parallel
```

### Test Specific Providers

```bash
node tests/chat-providers/run-all-providers.js --providers=k2think,grok
```

### Add Your Own Provider

Edit `tests/chat-providers/chat-provider-test.js`:

```javascript
const PROVIDERS = {
    myprovider: {
        name: 'My Provider',
        url: 'https://myprovider.com/',
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
            response: ['.ai-message']
        },
        captcha: {
            selectors: ['iframe[src*="captcha"]'],
            enabled: false
        }
    }
};
```

Then test it:

```bash
npm run test:chat:provider myprovider
```

## 💡 Pro Tips

### 1. Start With Providers Without Captcha

Test order by reliability:
1. ✅ k2think - No captcha, works great
2. ✅ grok - No captcha, works great  
3. ⚠️  qwen - May have captcha
4. ⚠️  mistral - May have captcha
5. ⚠️  deepseek - Slow loading
6. ⚠️  zai - Requires auth, may have captcha

### 2. Watch the Browser

Run with `headless: false` (default) to see what's happening:

```javascript
const CONFIG = {
    headless: false,  // Show browser
    slowMo: 50,       // Slow down actions
};
```

### 3. Check Screenshots First

Before debugging code, check the screenshots:

```bash
ls -lh /tmp/chat-provider-screenshots/
eog /tmp/chat-provider-screenshots/qwen-*.png
```

### 4. Use Logs

All actions are logged with timestamps. Great for debugging:

```
[2025-01-15T10:30:00.000Z] [INFO] Starting login...
[2025-01-15T10:30:01.234Z] [INFO] Trying selector: input[type="email"]
[2025-01-15T10:30:01.456Z] [SUCCESS] ✅ Found using: input[type="email"]
```

### 5. Generate YAML Configs

Even failed tests generate partial configs. Use them as starting points:

```bash
cat /tmp/chat-provider-test-results/qwen-config.yaml
```

## 🆘 Need Help?

### Check Documentation

```bash
cat tests/chat-providers/README.md
```

### View Example Screenshots

All screenshots saved to: `/tmp/chat-provider-screenshots/`

### Check Generated Configs

All configs saved to: `/tmp/chat-provider-test-results/`

### Run With More Logging

Edit `CONFIG` in `chat-provider-test.js`:

```javascript
const CONFIG = {
    headless: false,  // Show browser
    slowMo: 100,      // Really slow down
    timeout: 90000,   // Increase timeout
};
```

## 🎉 Success Criteria

You've successfully completed the quick start when:

- ✅ K2Think test passes
- ✅ You understand how captcha detection works
- ✅ You can view generated YAML configs
- ✅ You can read test results and screenshots

Now you're ready to test all providers and add your own!

## 📞 Getting Help

- **Documentation:** `README.md` in this directory
- **GitHub Issues:** https://github.com/Zeeeepa/cli/issues
- **Screenshots:** Check `/tmp/chat-provider-screenshots/`
- **Logs:** Check test output for timestamped logs

---

**Time to complete:** 5-10 minutes  
**Difficulty:** Beginner  
**Prerequisites:** Node.js 16+, npm

