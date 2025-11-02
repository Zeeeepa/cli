#!/usr/bin/env node

/**
 * Simple test to verify K2Think provider with actual browser
 * This is a headless test that can run in CI/CD
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testK2Think() {
    console.log('🚀 Testing K2Think Provider');
    console.log('================================\n');
    
    let browser;
    try {
        // Launch browser in headless mode
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('✅ Browser launched');
        
        // Navigate to K2Think
        console.log('\n📍 Navigating to https://www.k2think.ai/');
        await page.goto('https://www.k2think.ai/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        console.log('✅ Page loaded');
        
        // Take screenshot
        const screenshotsDir = '/tmp/k2think-test';
        await fs.mkdir(screenshotsDir, { recursive: true });
        await page.screenshot({
            path: path.join(screenshotsDir, '01-homepage.png'),
            fullPage: true
        });
        console.log(`✅ Screenshot saved: ${screenshotsDir}/01-homepage.png`);
        
        // Get page info
        const title = await page.title();
        const url = page.url();
        
        console.log(`\n📄 Page Info:`);
        console.log(`   Title: ${title}`);
        console.log(`   URL: ${url}`);
        
        // Try to find login elements
        console.log('\n🔍 Looking for login elements...');
        
        const emailSelectors = [
            'input[type="email"]',
            'input[name="email"]',
            '#email',
            'input[placeholder*="email" i]'
        ];
        
        let emailFound = null;
        for (const selector of emailSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    emailFound = selector;
                    console.log(`✅ Found email field: ${selector}`);
                    break;
                }
            } catch (error) {
                // Continue
            }
        }
        
        if (!emailFound) {
            console.log('⚠️  No email field found - might need to click login first');
            
            // Try to find login/signin button
            const loginButtons = [
                'button:has-text("Log in")',
                'button:has-text("Sign in")',
                'a:has-text("Log in")',
                'a:has-text("Sign in")',
                '[href*="login"]',
                '[href*="signin"]'
            ];
            
            for (const selector of loginButtons) {
                try {
                    const button = await page.$(selector);
                    if (button) {
                        console.log(`✅ Found login button: ${selector}`);
                        break;
                    }
                } catch (error) {
                    // Continue
                }
            }
        }
        
        // Get all visible text
        const bodyText = await page.evaluate(() => {
            return document.body.innerText.substring(0, 500);
        });
        
        console.log(`\n📝 Page content preview:`);
        console.log(bodyText);
        
        console.log('\n✅ K2Think provider is accessible');
        console.log(`\n📊 Result: SUCCESS`);
        console.log(`   Provider: K2Think`);
        console.log(`   URL: ${url}`);
        console.log(`   Status: Reachable`);
        console.log(`   Email field: ${emailFound || 'Not found on homepage'}`);
        
        return {
            success: true,
            provider: 'k2think',
            url: url,
            emailSelector: emailFound,
            screenshots: screenshotsDir
        };
        
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        return {
            success: false,
            provider: 'k2think',
            error: error.message
        };
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n✅ Browser closed');
        }
    }
}

// Run test
if (require.main === module) {
    testK2Think()
        .then(result => {
            console.log('\n' + '='.repeat(50));
            console.log('TEST COMPLETE');
            console.log('='.repeat(50));
            console.log(JSON.stringify(result, null, 2));
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { testK2Think };

