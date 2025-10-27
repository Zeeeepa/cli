/**
 * Local Sandbox Manager
 * Wraps @anthropic-ai/sandbox-runtime for TestUI local execution
 */

const { findChromeOrFail, getChromeVersion } = require('./chrome-finder');
const sandboxConfig = require('../sandbox-config');
const path = require('path');
const fs = require('fs');

class LocalSandboxManager {
  constructor() {
    this.initialized = false;
    this.sandboxRuntime = null;
    this.chromePath = null;
    this.violations = [];
    this.config = sandboxConfig;
  }

  /**
   * Initialize the sandbox runtime
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically require sandbox-runtime (may not be installed yet)
      const { SandboxManager } = require('@anthropic-ai/sandbox-runtime');
      this.sandboxRuntime = SandboxManager;

      // Find Chrome binary
      this.chromePath = findChromeOrFail();
      
      if (this.config.security.verbose) {
        const version = getChromeVersion(this.chromePath);
        console.log(`[Sandbox] Found Chrome: ${this.chromePath}`);
        console.log(`[Sandbox] Chrome version: ${version || 'unknown'}`);
      }

      // Initialize sandbox with config
      await this.sandboxRuntime.initialize({
        filesystem: this.config.filesystem,
        network: this.config.network,
        process: this.config.process,
        security: this.config.security,
        platform: this.config.platform
      });

      // Setup violation tracking
      if (this.sandboxRuntime.getSandboxViolationStore) {
        this.violationStore = this.sandboxRuntime.getSandboxViolationStore();
      }

      this.initialized = true;
      
      if (this.config.security.verbose) {
        console.log('[Sandbox] Initialization complete');
      }
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'sandbox-runtime not installed. Run: npm install github:Zeeeepa/sandbox-runtime'
        );
      }
      throw new Error(`Failed to initialize sandbox: ${error.message}`);
    }
  }

  /**
   * Add a domain to the allowed domains list dynamically
   * @param {string} domain Domain to allow (e.g., 'localhost:8080', 'example.com')
   */
  addAllowedDomain(domain) {
    if (!this.config.network.allowedDomains.includes(domain)) {
      this.config.network.allowedDomains.push(domain);
      
      if (this.config.security.verbose) {
        console.log(`[Sandbox] Added allowed domain: ${domain}`);
      }
    }
  }

  /**
   * Get Chrome path (for passing to test frameworks)
   * @returns {string} Path to Chrome executable
   */
  getChromePath() {
    if (!this.chromePath) {
      throw new Error('Sandbox not initialized. Call initialize() first.');
    }
    return this.chromePath;
  }

  /**
   * Get all sandbox violations that have occurred
   * @returns {Array} Array of violation objects
   */
  getViolations() {
    if (this.violationStore) {
      return this.violationStore.getAll();
    }
    return this.violations;
  }

  /**
   * Check if sandbox has violations
   * @returns {boolean} True if violations occurred
   */
  hasViolations() {
    return this.getViolations().length > 0;
  }

  /**
   * Get human-readable error message for violations
   * @returns {string} Formatted error message
   */
  getViolationMessage() {
    const violations = this.getViolations();
    
    if (violations.length === 0) {
      return '';
    }

    let message = '\n🚫 Sandbox Violations Detected:\n\n';
    
    for (const violation of violations.slice(0, 5)) {
      message += `  • ${violation.type}: ${violation.details}\n`;
      
      if (violation.type === 'filesystem') {
        message += `    → Add path to sandbox-config.js allowWrite/allowRead\n`;
      } else if (violation.type === 'network') {
        message += `    → Add domain to sandbox-config.js allowedDomains\n`;
      }
    }

    if (violations.length > 5) {
      message += `\n  ... and ${violations.length - 5} more violations\n`;
    }

    return message;
  }

  /**
   * Ensure required directories exist with proper permissions
   */
  async setupDirectories() {
    const dirs = [
      path.join(process.cwd(), 'screenshots'),
      path.join(process.cwd(), 'logs')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        
        if (this.config.security.verbose) {
          console.log(`[Sandbox] Created directory: ${dir}`);
        }
      }
    }
  }

  /**
   * Reset sandbox state and cleanup resources
   */
  async reset() {
    if (this.sandboxRuntime && this.sandboxRuntime.reset) {
      await this.sandboxRuntime.reset();
    }
    
    this.violations = [];
    
    if (this.config.security.verbose) {
      console.log('[Sandbox] Reset complete');
    }
  }

  /**
   * Cleanup sandbox resources
   */
  async cleanup() {
    await this.reset();
    this.initialized = false;
    
    if (this.config.security.verbose) {
      console.log('[Sandbox] Cleanup complete');
    }
  }
}

// Export singleton instance
let instance = null;

module.exports = {
  LocalSandboxManager,
  
  /**
   * Get singleton instance of LocalSandboxManager
   * @returns {LocalSandboxManager}
   */
  getInstance() {
    if (!instance) {
      instance = new LocalSandboxManager();
    }
    return instance;
  },
  
  /**
   * Reset singleton instance (for testing)
   */
  resetInstance() {
    instance = null;
  }
};
