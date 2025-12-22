/**
 * Dependency Injection Container
 * Manages service lifecycle and dependencies
 */

const { getLogger } = require('../utils/logger');

const logger = getLogger('container');

class Container {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a service with the container
   * @param {string} name - Service name
   * @param {Function} factory - Factory function to create the service
   * @param {Object} options - Registration options
   * @param {string} options.lifecycle - 'singleton' or 'transient'
   * @param {Array<string>} options.dependencies - Array of dependency names
   */
  register(name, factory, options = {}) {
    const { lifecycle = 'singleton', dependencies = [] } = options;

    this.services.set(name, {
      factory,
      lifecycle,
      dependencies
    });

    logger.info(`Registered service: ${name} (${lifecycle})`);
  }

  /**
   * Resolve a service from the container
   * @param {string} name - Service name
   * @returns {*} Service instance
   */
  resolve(name) {
    const serviceConfig = this.services.get(name);

    if (!serviceConfig) {
      throw new Error(`Service not found: ${name}`);
    }

    // Return singleton instance if already created
    if (serviceConfig.lifecycle === 'singleton' && this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Resolve dependencies
    const dependencies = serviceConfig.dependencies.map(dep => this.resolve(dep));

    // Create instance
    const instance = serviceConfig.factory(...dependencies);

    // Cache singleton
    if (serviceConfig.lifecycle === 'singleton') {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   * @returns {Array<string>}
   */
  getRegisteredServices() {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all singletons (useful for testing)
   */
  clearSingletons() {
    this.singletons.clear();
    logger.info('Cleared all singleton instances');
  }

  /**
   * Reset the entire container
   */
  reset() {
    this.services.clear();
    this.singletons.clear();
    logger.info('Container reset');
  }
}

// Create and export singleton container instance
const container = new Container();

module.exports = container;
module.exports.Container = Container;

