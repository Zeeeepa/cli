/**
 * Local Sandbox Implementation for TestDriver
 * 
 * This module implements a WebSocket-based sandbox that mimics TestDriver's cloud infrastructure
 * using Playwright for local browser automation.
 */

const { chromium } = require('playwright');
const logger = require('../utils/logger');

class LocalSandbox {
  constructor(instanceId) {
    this.instanceId = instanceId;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.mousePosition = { x: 0, y: 0 };
    this.isReady = false;
  }

  async initialize() {
    try {
      logger.info(`Initializing sandbox ${this.instanceId}...`);
      
      // Launch browser
      this.browser = await chromium.launch({
        headless: false, // Show browser for debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      // Create context
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      // Create page
      this.page = await this.context.newPage();
      
      // Navigate to blank page
      await this.page.goto('about:blank');

      this.isReady = true;
      logger.info(`Sandbox ${this.instanceId} initialized successfully`);
      
      return true;
    } catch (error) {
      logger.error(`Failed to initialize sandbox ${this.instanceId}:`, error);
      throw error;
    }
  }

  async executeCommand(message) {
    if (!this.isReady) {
      return { success: false, error: 'Sandbox not initialized' };
    }

    try {
      const { type } = message;
      logger.debug(`Executing command: ${type}`);

      switch (type) {
        case 'system.screenshot':
          return await this.takeScreenshot();

        case 'system.get-mouse-position':
          return { success: true, out: this.mousePosition };

        case 'system.get-active-window':
          return { success: true, out: { title: await this.page.title() } };

        case 'moveMouse':
          return await this.moveMouse(message.x, message.y);

        case 'leftClick':
          return await this.click('left');

        case 'rightClick':
          return await this.click('right');

        case 'doubleClick':
          return await this.doubleClick();

        case 'write':
          return await this.type(message.text, message.delay);

        case 'press':
          return await this.pressKeys(message.keys);

        case 'scroll':
          return await this.scroll(message.amount, message.direction);

        case 'navigate':
          return await this.navigate(message.url);

        case 'exec':
          return await this.executeScript(message.code);

        default:
          logger.warn(`Unknown command type: ${type}`);
          return { success: true, message: `Command ${type} acknowledged` };
      }
    } catch (error) {
      logger.error(`Error executing command ${message.type}:`, error);
      return { success: false, error: error.message };
    }
  }

  async takeScreenshot() {
    try {
      const screenshot = await this.page.screenshot({ type: 'png' });
      const base64 = screenshot.toString('base64');
      return { success: true, base64 };
    } catch (error) {
      logger.error('Screenshot failed:', error);
      return { success: false, error: error.message };
    }
  }

  async moveMouse(x, y) {
    this.mousePosition = { x, y };
    await this.page.mouse.move(x, y);
    return { success: true };
  }

  async click(button = 'left') {
    await this.page.mouse.click(this.mousePosition.x, this.mousePosition.y, { button });
    return { success: true };
  }

  async doubleClick() {
    await this.page.mouse.dblclick(this.mousePosition.x, this.mousePosition.y);
    return { success: true };
  }

  async type(text, delay = 0) {
    await this.page.keyboard.type(text, { delay });
    return { success: true };
  }

  async pressKeys(keys) {
    for (const key of keys) {
      // Map common keys
      const keyMap = {
        'ctrl': 'Control',
        'alt': 'Alt',
        'shift': 'Shift',
        'enter': 'Enter',
        'escape': 'Escape',
        'pageup': 'PageUp',
        'pagedown': 'PageDown',
        'backspace': 'Backspace',
        'delete': 'Delete',
        'tab': 'Tab'
      };
      
      const mappedKey = keyMap[key.toLowerCase()] || key;
      await this.page.keyboard.press(mappedKey);
    }
    return { success: true };
  }

  async scroll(amount, direction) {
    const deltaY = direction === 'down' ? amount : -amount;
    await this.page.mouse.wheel(0, deltaY);
    return { success: true };
  }

  async navigate(url) {
    await this.page.goto(url, { waitUntil: 'networkidle' });
    return { success: true };
  }

  async executeScript(code) {
    try {
      const result = await this.page.evaluate(code);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async cleanup() {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
      this.isReady = false;
      logger.info(`Sandbox ${this.instanceId} cleaned up`);
    } catch (error) {
      logger.error(`Error cleaning up sandbox ${this.instanceId}:`, error);
    }
  }
}

module.exports = { LocalSandbox };

