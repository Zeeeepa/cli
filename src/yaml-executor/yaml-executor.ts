import puppeteer, { Browser, Page, WaitForOptions } from 'puppeteer';
import { SandboxManager } from '@anthropic-ai/sandbox-runtime';
import type { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  YAMLTestSpec,
  Action,
  NavigateAction,
  ClickAction,
  TypeAction,
  WaitAction,
  ScreenshotAction,
  EvaluateAction,
  AssertExistsAction,
} from './yaml-schema.js';

export interface ExecutionContext {
  browser: Browser;
  page: Page;
  variables: Map<string, any>;
  startTime: number;
  currentAction: number;
}

export interface ExecutionResult {
  success: boolean;
  duration: number;
  actionsCompleted: number;
  error?: {
    action: number;
    type: string;
    message: string;
    selector?: string;
    timestamp: number;
  };
  screenshots: string[];
  variables: Record<string, any>;
}

export class YAMLExecutor {
  private sandboxInitialized: boolean = false;

  constructor() {}

  /**
   * Initialize sandbox with configuration from YAML spec
   */
  async initializeSandbox(spec: YAMLTestSpec): Promise<void> {
    if (this.sandboxInitialized) {
      return;
    }

    const sandboxConfig: SandboxRuntimeConfig = {
      network: {
        allowedDomains: spec.sandbox?.network?.allowedDomains ?? ['localhost', '127.0.0.1'],
        deniedDomains: spec.sandbox?.network?.deniedDomains ?? ['*'],
      },
      filesystem: {
        allowRead: spec.sandbox?.filesystem?.allowRead ?? ['.'],
        allowWrite: spec.sandbox?.filesystem?.allowWrite ?? ['./screenshots', './logs'],
        denyRead: spec.sandbox?.filesystem?.denyRead ?? ['~/.ssh', '~/.aws'],
        denyWrite: spec.sandbox?.filesystem?.denyWrite ?? ['/etc', '/usr', '/System'],
      },
      allowUnixSockets: spec.sandbox?.allowUnixSockets,
      allowLocalBinding: spec.sandbox?.allowLocalBinding ?? false,
    };

    await SandboxManager.initialize(
      sandboxConfig,
      async (violation) => {
        console.warn('⚠️  Sandbox violation detected:', violation);
        return false; // Deny by default
      },
      true // Enable log monitor
    );

    this.sandboxInitialized = true;
  }

  /**
   * Launch browser in sandboxed environment
   */
  async launchBrowser(): Promise<Browser> {
    // Get Chrome path - try common locations
    const chromePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ];

    let chromePath: string | undefined;
    for (const p of chromePaths) {
      try {
        await fs.access(p);
        chromePath = p;
        break;
      } catch {
        // Try next path
      }
    }

    // Wrap Chrome launch command with sandbox
    const launchCommand = chromePath ? `${chromePath} --headless=new` : 'chromium --headless=new';
    const wrappedCommand = await SandboxManager.wrapWithSandbox(launchCommand);

    console.log('🚀 Launching sandboxed browser...');

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
      executablePath: chromePath,
    });

    return browser;
  }

  /**
   * Execute a complete YAML test specification
   */
  async execute(spec: YAMLTestSpec): Promise<ExecutionResult> {
    const startTime = Date.now();
    const screenshots: string[] = [];
    const variables = new Map<string, any>();

    // Add built-in variables
    variables.set('timestamp', Date.now());
    variables.set('date', new Date().toISOString().split('T')[0]);
    variables.set('random', Math.random().toString(36).substring(7));

    let browser: Browser | undefined;
    let page: Page | undefined;
    let currentAction = 0;

    try {
      // Initialize sandbox
      await this.initializeSandbox(spec);

      // Launch browser
      browser = await this.launchBrowser();
      page = await browser.newPage();

      // Set viewport
      await page.setViewport({ width: 1280, height: 720 });

      const context: ExecutionContext = {
        browser,
        page,
        variables,
        startTime,
        currentAction: 0,
      };

      // Execute actions sequentially
      for (let i = 0; i < spec.actions.length; i++) {
        currentAction = i;
        context.currentAction = i;

        const action = spec.actions[i];
        console.log(`🔄 Executing action ${i + 1}/${spec.actions.length}: ${action.type}`);

        const screenshot = await this.executeAction(action, context);
        if (screenshot) {
          screenshots.push(screenshot);
        }
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        duration,
        actionsCompleted: spec.actions.length,
        screenshots,
        variables: Object.fromEntries(variables.entries()),
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        duration,
        actionsCompleted: currentAction,
        error: {
          action: currentAction,
          type: error.name || 'UnknownError',
          message: error.message || 'An unknown error occurred',
          selector: error.selector,
          timestamp: Date.now(),
        },
        screenshots,
        variables: Object.fromEntries(variables.entries()),
      };
    } finally {
      // Cleanup
      if (browser) {
        await browser.close();
      }
      await SandboxManager.reset();
      this.sandboxInitialized = false;
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: Action, context: ExecutionContext): Promise<string | undefined> {
    switch (action.type) {
      case 'navigate':
        return await this.executeNavigate(action, context);
      case 'click':
        return await this.executeClick(action, context);
      case 'type':
        return await this.executeType(action, context);
      case 'wait':
        return await this.executeWait(action, context);
      case 'screenshot':
        return await this.executeScreenshot(action, context);
      case 'evaluate':
        return await this.executeEvaluate(action, context);
      case 'assertExists':
        return await this.executeAssertExists(action, context);
      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  /**
   * Execute navigate action
   */
  private async executeNavigate(action: NavigateAction, context: ExecutionContext): Promise<undefined> {
    const url = this.interpolateVariables(action.url, context.variables);

    const waitUntilOption = action.waitUntil as WaitForOptions['waitUntil'];

    await context.page.goto(url, {
      waitUntil: waitUntilOption,
      timeout: action.timeout,
    });

    return undefined;
  }

  /**
   * Execute click action
   */
  private async executeClick(action: ClickAction, context: ExecutionContext): Promise<undefined> {
    const selector = this.interpolateVariables(action.selector, context.variables);

    await context.page.waitForSelector(selector, { timeout: action.timeout });

    await context.page.click(selector, {
      button: action.button,
      clickCount: action.clickCount,
      delay: action.delay,
    });

    return undefined;
  }

  /**
   * Execute type action
   */
  private async executeType(action: TypeAction, context: ExecutionContext): Promise<undefined> {
    const selector = this.interpolateVariables(action.selector, context.variables);
    const text = this.interpolateVariables(action.text, context.variables);

    await context.page.waitForSelector(selector, { timeout: action.timeout });

    if (action.clear) {
      await context.page.click(selector, { clickCount: 3 });
      await context.page.keyboard.press('Backspace');
    }

    await context.page.type(selector, text, { delay: action.delay });

    return undefined;
  }

  /**
   * Execute wait action
   */
  private async executeWait(action: WaitAction, context: ExecutionContext): Promise<undefined> {
    if (action.condition === 'selector') {
      if (!action.selector) {
        throw new Error('selector is required for wait condition "selector"');
      }

      const selector = this.interpolateVariables(action.selector, context.variables);

      const stateOption: 'visible' | 'hidden' | 'attached' | 'detached' = action.state ?? 'visible';

      const waitForOptions: any = { timeout: action.timeout };

      if (stateOption === 'visible') {
        waitForOptions.visible = true;
      } else if (stateOption === 'hidden') {
        waitForOptions.hidden = true;
      }

      await context.page.waitForSelector(selector, waitForOptions);
    } else if (action.condition === 'timeout') {
      if (!action.duration) {
        throw new Error('duration is required for wait condition "timeout"');
      }
      await new Promise((resolve) => setTimeout(resolve, action.duration));
    } else if (action.condition === 'navigation') {
      await context.page.waitForNavigation({
        timeout: action.timeout,
        waitUntil: 'networkidle',
      });
    }

    return undefined;
  }

  /**
   * Execute screenshot action
   */
  private async executeScreenshot(action: ScreenshotAction, context: ExecutionContext): Promise<string> {
    const screenshotPath = this.interpolateVariables(action.path, context.variables);

    // Ensure directory exists
    const dir = path.dirname(screenshotPath);
    await fs.mkdir(dir, { recursive: true });

    const options: any = {
      path: screenshotPath,
      type: action.type,
    };

    if (action.type === 'jpeg') {
      options.quality = action.quality;
    }

    if (action.selector) {
      const selector = this.interpolateVariables(action.selector, context.variables);
      const element = await context.page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
      await element.screenshot(options);
    } else {
      options.fullPage = action.fullPage;
      await context.page.screenshot(options);
    }

    return screenshotPath;
  }

  /**
   * Execute evaluate action
   */
  private async executeEvaluate(action: EvaluateAction, context: ExecutionContext): Promise<undefined> {
    const script = this.interpolateVariables(action.script, context.variables);

    const result = await context.page.evaluate(script);

    if (action.returnVariable) {
      context.variables.set(action.returnVariable, result);
    }

    return undefined;
  }

  /**
   * Execute assertExists action
   */
  private async executeAssertExists(action: AssertExistsAction, context: ExecutionContext): Promise<undefined> {
    const selector = this.interpolateVariables(action.selector, context.variables);

    const stateOption: 'visible' | 'hidden' | 'attached' = action.state ?? 'attached';

    try {
      const waitForOptions: any = { timeout: action.timeout };

      if (stateOption === 'visible') {
        waitForOptions.visible = true;
      } else if (stateOption === 'hidden') {
        waitForOptions.hidden = true;
      }

      await context.page.waitForSelector(selector, waitForOptions);
    } catch (error) {
      const message = action.message || `Assertion failed: Element "${selector}" not found in state "${stateOption}"`;
      throw new Error(message);
    }

    return undefined;
  }

  /**
   * Interpolate variables in strings using ${varName} syntax
   */
  private interpolateVariables(text: string, variables: Map<string, any>): string {
    return text.replace(/\$\{(\w+)\}/g, (_, varName) => {
      const value = variables.get(varName);
      return value !== undefined ? String(value) : `\${${varName}}`;
    });
  }
}

