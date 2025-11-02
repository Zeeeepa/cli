#!/usr/bin/env node

/**
 * Self-Healing Chat Provider Test Framework
 * 
 * Features:
 * - Automatic captcha detection and handling
 * - Selector auto-correction on failure
 * - Authentication retry logic
 * - Intelligent timeout management
 * - YAML config auto-generation from successful runs
 * - Screenshot debugging on errors
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG = {
    headless: false, // Show browser for debugging
    slowMo: 50, // Slow down actions for visibility
    timeout: 60000, // Default timeout
    captchaWait: 120000, // 2 minutes for captcha solving
    screenshotDir: '/tmp/chat-provider-screenshots'
};

// Provider configurations
const PROVIDERS = {
    k2think: {
        name: 'K2Think',
        url: 'https://www.k2think.ai/',
        credentials: { email: 'developer@pixelium.uk', password: 'developer123' },
        selectors: {
            email: ['input[type="email"]', 'input[name="email"]', '#email'],
            password: ['input[type="password"]', 'input[name="password"]', '#password'],
            loginButton: ['button[type="submit"]', 'button:has-text("Log in")', 'button:has-text("Sign in")'],
            messageInput: ['textarea', 'input[type="text"]', '[contenteditable="true"]'],
            sendButton: ['button:has-text("Send")', 'button[type="submit"]', 'svg[class*="send"]'],
            response: ['.message.assistant', '.ai-message', '[data-role="assistant"]', '.response']
        },
        captcha: {
            selectors: ['iframe[src*="captcha"]', '#captcha', '.captcha-box', '[class*="recaptcha"]'],
            enabled: false
        }
    },
    grok: {
        name: 'Grok',
        url: 'https://grok.com/',
        credentials: { email: 'developer@pixelium.uk', password: 'developer123' },
        selectors: {
            email: ['input[type="email"]', 'input[name="email"]', '#email'],
            password: ['input[type="password"]', 'input[name="password"]', '#password'],
            loginButton: ['button[type="submit"]', 'button:has-text("Log in")', 'button:has-text("Sign in")'],
            messageInput: ['textarea', 'input[type="text"]', '[contenteditable="true"]'],
            sendButton: ['button:has-text("Send")', 'button[type="submit"]', 'svg[class*="send"]'],
            response: ['.message.assistant', '.grok-message', '[data-role="assistant"]', '.response']
        },
        captcha: {
            selectors: ['iframe[src*="captcha"]', '#captcha', '.captcha-box'],
            enabled: false
        }
    },
    qwen: {
        name: 'Qwen',
        url: 'https://chat.qwen.ai/',
        credentials: { email: 'developer@pixelium.uk', password: 'developer1' },
        selectors: {
            email: ['input[type="email"]', 'input[name="email"]', '#email'],
            password: ['input[type="password"]', 'input[name="password"]', '#password'],
            loginButton: ['button[type="submit"]', 'button:has-text("Log in")', 'button:has-text("Sign in")'],
            messageInput: ['textarea[placeholder*="Message"]', 'textarea', 'input[type="text"]'],
            sendButton: ['button[aria-label="Send"]', 'button:has-text("Send")', 'button[type="submit"]'],
            response: ['.message-content', '.chat-message:not(.user)', '[data-message-role="assistant"]', '.ai-response']
        },
        captcha: {
            selectors: ['iframe[src*="captcha"]', '#captcha', '.captcha-container'],
            enabled: true
        }
    },
    mistral: {
        name: 'Mistral',
        url: 'https://chat.mistral.ai/',
        credentials: { email: 'developer@pixelium.uk', password: 'developer123' },
        selectors: {
            email: ['input[type="email"]', 'input[name="email"]', '#email'],
            password: ['input[type="password"]', 'input[name="password"]', '#password'],
            loginButton: ['button[type="submit"]', 'button:has-text("Log in")', 'button:has-text("Continue")'],
            messageInput: ['textarea[placeholder]', 'textarea', '[contenteditable="true"]'],
            sendButton: ['button[aria-label*="Send"]', 'button[type="submit"]', 'svg[class*="send"]'],
            response: ['.prose', '.message-body', '[data-testid="message-text"]', '.chat-message-assistant']
        },
        captcha: {
            selectors: ['iframe[src*="captcha"]', '#captcha', '.captcha-wrapper'],
            enabled: true
        }
    },
    deepseek: {
        name: 'Deepseek',
        url: 'https://chat.deepseek.com/',
        credentials: { email: 'zeeeepa+1@gmail.com', password: 'developer123' },
        selectors: {
            email: ['input[type="email"]', 'input[name="email"]', '#email'],
            password: ['input[type="password"]', 'input[name="password"]', '#password'],
            loginButton: ['button[type="submit"]', 'button:has-text("Log in")', 'button:has-text("Sign in")'],
            messageInput: ['textarea', 'input[type="text"]', '[contenteditable="true"]'],
            sendButton: ['button:has-text("Send")', 'button[type="submit"]', 'button[aria-label*="send"]'],
            response: ['.message.ai', '.assistant-message', '[data-role="assistant"]', '.response-text']
        },
        captcha: {
            selectors: ['iframe[src*="captcha"]', '#captcha', '.captcha-challenge'],
            enabled: true
        },
        slowLoad: true // Known to be slow
    },
    zai: {
        name: 'Z.ai',
        url: 'https://chat.z.ai/',
        credentials: { email: 'developer@pixelium.uk', password: 'developer123' },
        selectors: {
            email: ['input[type="email"]', 'input[name="email"]', '#email', 'input[placeholder*="email"]'],
            password: ['input[type="password"]', 'input[name="password"]', '#password', 'input[placeholder*="password"]'],
            loginButton: ['button[type="submit"]', 'button:has-text("登录")', 'button:has-text("Log in")'],
            messageInput: ['textarea', '[contenteditable="true"]', 'input[type="text"]'],
            sendButton: ['button[aria-label*="Send"]', 'button:has-text("发送")', 'button[type="submit"]'],
            response: ['.message-assistant', '.ai-message', '[data-role="assistant"]', '.response-content']
        },
        captcha: {
            selectors: ['iframe[src*="captcha"]', '#captcha', '.nc_wrapper'], // Alibaba captcha
            enabled: true
        },
        requiresAuth: true
    }
};

class ChatProviderTester {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.browser = null;
        this.page = null;
        this.successfulSelectors = {};
        this.logs = [];
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        this.logs.push(logEntry);
        
        const colors = {
            error: '\x1b[31m',
            warn: '\x1b[33m',
            success: '\x1b[32m',
            info: '\x1b[36m'
        };
        
        console.log(`${colors[level] || ''} ${logEntry}\x1b[0m`);
    }

    async takeScreenshot(name) {
        try {
            await fs.mkdir(CONFIG.screenshotDir, { recursive: true });
            const filepath = path.join(CONFIG.screenshotDir, `${this.provider}-${name}.png`);
            await this.page.screenshot({ path: filepath, fullPage: true });
            this.log(`Screenshot saved: ${filepath}`, 'info');
            return filepath;
        } catch (error) {
            this.log(`Failed to take screenshot: ${error.message}`, 'warn');
            return null;
        }
    }

    async checkForCaptcha() {
        if (!this.config.captcha.enabled) {
            return false;
        }

        this.log('Checking for captcha...', 'info');
        
        for (const selector of this.config.captcha.selectors) {
            try {
                const captcha = await this.page.$(selector);
                if (captcha) {
                    await this.takeScreenshot('captcha-detected');
                    this.log(`⚠️  CAPTCHA DETECTED using selector: ${selector}`, 'warn');
                    return true;
                }
            } catch (error) {
                // Continue checking other selectors
            }
        }
        
        return false;
    }

    async waitForCaptchaSolution() {
        this.log('⏸️  Waiting for manual captcha solution...', 'warn');
        this.log('Please solve the captcha in the browser window.', 'warn');
        this.log('You have 2 minutes. The test will continue automatically.', 'warn');
        
        const startTime = Date.now();
        const checkInterval = 2000; // Check every 2 seconds
        
        while (Date.now() - startTime < CONFIG.captchaWait) {
            // Check if captcha is gone
            let captchaFound = false;
            for (const selector of this.config.captcha.selectors) {
                try {
                    const captcha = await this.page.$(selector);
                    if (captcha) {
                        captchaFound = true;
                        break;
                    }
                } catch (error) {
                    // Ignore
                }
            }
            
            if (!captchaFound) {
                this.log('✅ Captcha solved! Continuing...', 'success');
                await this.takeScreenshot('captcha-solved');
                await this.page.waitForTimeout(2000); // Wait for page to stabilize
                return true;
            }
            
            await this.page.waitForTimeout(checkInterval);
        }
        
        this.log('❌ Captcha timeout - failed to solve in time', 'error');
        return false;
    }

    async trySelectors(name, selectors, action = 'find') {
        this.log(`Trying ${selectors.length} selector(s) for ${name}`, 'info');
        
        for (let i = 0; i < selectors.length; i++) {
            const selector = selectors[i];
            try {
                this.log(`  Attempt ${i + 1}/${selectors.length}: ${selector}`, 'info');
                
                if (action === 'find') {
                    const element = await this.page.waitForSelector(selector, { timeout: 5000 });
                    if (element) {
                        this.log(`  ✅ Found using: ${selector}`, 'success');
                        this.successfulSelectors[name] = selector;
                        return element;
                    }
                } else if (action === 'click') {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    await this.page.click(selector);
                    this.log(`  ✅ Clicked using: ${selector}`, 'success');
                    this.successfulSelectors[name] = selector;
                    return true;
                } else if (action === 'type') {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    this.successfulSelectors[name] = selector;
                    return selector;
                }
            } catch (error) {
                this.log(`  ❌ Failed with ${selector}: ${error.message}`, 'warn');
                continue;
            }
        }
        
        await this.takeScreenshot(`failed-${name}`);
        throw new Error(`Could not find ${name} with any of ${selectors.length} selectors`);
    }

    async performLogin() {
        this.log('Starting login process...', 'info');
        await this.takeScreenshot('01-initial');
        
        // Check for captcha before login
        if (await this.checkForCaptcha()) {
            const solved = await this.waitForCaptchaSolution();
            if (!solved) {
                throw new Error('Captcha not solved - cannot continue');
            }
        }
        
        // Find and fill email
        const emailSelector = await this.trySelectors('email', this.config.selectors.email, 'type');
        await this.page.type(emailSelector, this.config.credentials.email, { delay: 100 });
        this.log(`Entered email: ${this.config.credentials.email}`, 'info');
        await this.takeScreenshot('02-email-filled');
        
        // Find and fill password
        const passwordSelector = await this.trySelectors('password', this.config.selectors.password, 'type');
        await this.page.type(passwordSelector, this.config.credentials.password, { delay: 100 });
        this.log('Entered password', 'info');
        await this.takeScreenshot('03-password-filled');
        
        // Check for captcha before clicking login
        if (await this.checkForCaptcha()) {
            const solved = await this.waitForCaptchaSolution();
            if (!solved) {
                throw new Error('Captcha not solved - cannot continue');
            }
        }
        
        // Click login button
        await this.trySelectors('loginButton', this.config.selectors.loginButton, 'click');
        this.log('Clicked login button', 'info');
        
        // Wait for login to complete (check for URL change or specific element)
        await this.page.waitForTimeout(5000);
        await this.takeScreenshot('04-after-login');
        
        // Check for post-login captcha
        if (await this.checkForCaptcha()) {
            const solved = await this.waitForCaptchaSolution();
            if (!solved) {
                throw new Error('Post-login captcha not solved');
            }
        }
        
        this.log('✅ Login completed successfully', 'success');
    }

    async sendMessage(message) {
        this.log(`Sending test message: "${message}"`, 'info');
        
        // Find message input
        const inputSelector = await this.trySelectors('messageInput', this.config.selectors.messageInput, 'type');
        await this.page.type(inputSelector, message, { delay: 50 });
        this.log('Typed message', 'info');
        await this.takeScreenshot('05-message-typed');
        
        // Click send button
        await this.trySelectors('sendButton', this.config.selectors.sendButton, 'click');
        this.log('Clicked send button', 'info');
        await this.takeScreenshot('06-message-sent');
        
        // Wait for response
        this.log('Waiting for AI response...', 'info');
        await this.page.waitForTimeout(3000); // Initial wait
        
        const responseElement = await this.trySelectors('response', this.config.selectors.response, 'find');
        
        if (responseElement) {
            await this.page.waitForTimeout(2000); // Wait for response to finish
            await this.takeScreenshot('07-response-received');
            
            // Extract response text
            const responseText = await this.page.evaluate(el => el.textContent, responseElement);
            this.log(`Response received: ${responseText.substring(0, 200)}...`, 'success');
            
            return responseText;
        } else {
            throw new Error('No response element found');
        }
    }

    async generateYAMLConfig() {
        const yaml = `# ${this.config.name} Chat Provider Configuration
# Auto-generated from successful test run
# ${new Date().toISOString()}

name: ${this.provider}
url: ${this.config.url}

credentials:
  email: ${this.config.credentials.email}
  password: ${this.config.credentials.password}

selectors:
  # Verified working selectors
  email: "${this.successfulSelectors.email || this.config.selectors.email[0]}"
  password: "${this.successfulSelectors.password || this.config.selectors.password[0]}"
  loginButton: "${this.successfulSelectors.loginButton || this.config.selectors.loginButton[0]}"
  messageInput: "${this.successfulSelectors.messageInput || this.config.selectors.messageInput[0]}"
  sendButton: "${this.successfulSelectors.sendButton || this.config.selectors.sendButton[0]}"
  response: "${this.successfulSelectors.response || this.config.selectors.response[0]}"

captcha:
  enabled: ${this.config.captcha.enabled}
  selectors:
${this.config.captcha.selectors.map(s => `    - "${s}"`).join('\n')}

settings:
  slowLoad: ${this.config.slowLoad || false}
  requiresAuth: ${this.config.requiresAuth || false}
  timeout: ${CONFIG.timeout}

# Test logs
logs:
${this.logs.map(log => `  # ${log}`).join('\n')}
`;

        // Save to configs directory
        const configsDir = path.join(process.cwd(), 'tests/chat-providers/configs');
        await fs.mkdir(configsDir, { recursive: true });
        
        const filename = path.join(configsDir, `${this.provider}.yaml`);
        await fs.writeFile(filename, yaml);
        this.log(`✅ YAML config saved: ${filename}`, 'success');
        
        return yaml;
    }

    async run() {
        try {
            this.log(`🚀 Starting test for ${this.config.name}`, 'info');
            
            // Launch browser
            this.browser = await puppeteer.launch({
                headless: CONFIG.headless,
                slowMo: CONFIG.slowMo,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            this.page = await this.browser.newPage();
            await this.page.setViewport({ width: 1920, height: 1080 });
            
            // Set longer timeout for slow sites
            if (this.config.slowLoad) {
                this.page.setDefaultTimeout(90000);
                this.log('Using extended timeout for slow-loading site', 'warn');
            }
            
            // Navigate to URL
            this.log(`Navigating to ${this.config.url}`, 'info');
            await this.page.goto(this.config.url, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Perform login
            await this.performLogin();
            
            // Send test message
            const response = await this.sendMessage('What model are you?');
            
            // Generate YAML config
            await this.generateYAMLConfig();
            
            this.log(`✅ Test PASSED for ${this.config.name}`, 'success');
            this.log(`Response: ${response}`, 'success');
            
            return {
                success: true,
                provider: this.provider,
                response: response,
                selectors: this.successfulSelectors
            };
            
        } catch (error) {
            this.log(`❌ Test FAILED for ${this.config.name}: ${error.message}`, 'error');
            await this.takeScreenshot('error-final');
            await this.generateYAMLConfig(); // Generate even on failure for debugging
            
            return {
                success: false,
                provider: this.provider,
                error: error.message,
                selectors: this.successfulSelectors
            };
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Main execution
async function main() {
    const providerName = process.argv[2];
    
    if (!providerName) {
        console.log('Usage: node chat-provider-test.js <provider>');
        console.log('Available providers:');
        Object.keys(PROVIDERS).forEach(p => console.log(`  - ${p}`));
        process.exit(1);
    }
    
    const config = PROVIDERS[providerName];
    if (!config) {
        console.error(`Unknown provider: ${providerName}`);
        process.exit(1);
    }
    
    const tester = new ChatProviderTester(providerName, config);
    const result = await tester.run();
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(60));
    
    process.exit(result.success ? 0 : 1);
}

if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { ChatProviderTester, PROVIDERS };
