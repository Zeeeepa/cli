/**
 * Application Bootstrap
 * Registers all services, stores, and dependencies in the container
 */

const container = require('./container');
const config = require('../config');
const { getLogger } = require('../utils/logger');

const logger = getLogger('bootstrap');

function bootstrap() {
  logger.info('Bootstrapping application...');

  // Stores
  container.register('sessionStore', () => {
    const SessionStore = require('../stores/SessionStore');
    return new SessionStore();
  }, { lifecycle: 'singleton' });

  container.register('cacheStore', () => {
    const CacheStore = require('../stores/CacheStore');
    return new CacheStore({ maxSize: 1000, defaultTTL: 3600000 });
  }, { lifecycle: 'singleton' });

  // Core Services
  container.register('llmProvider', () => {
    const LLMProvider = require('../services/llm-provider');
    return new LLMProvider();
  }, { lifecycle: 'singleton' });

  container.register('yamlGenerator', (llmProvider) => {
    const YAMLGenerator = require('../services/yaml-generator');
    return new YAMLGenerator(llmProvider);
  }, { lifecycle: 'singleton', dependencies: ['llmProvider'] });

  container.register('commandValidator', () => {
    const { validateCommand, getCommandsSchema } = require('../models/commands');
    return { validateCommand, getCommandsSchema };
  }, { lifecycle: 'singleton' });

  // Business Services
  container.register('testGenerationService', (yamlGenerator, commandValidator) => {
    const TestGenerationService = require('../services/TestGenerationService');
    return new TestGenerationService(yamlGenerator, commandValidator);
  }, { lifecycle: 'singleton', dependencies: ['yamlGenerator', 'commandValidator'] });

  container.register('explorationService', (yamlGenerator, sessionStore) => {
    const ExplorationService = require('../services/ExplorationService');
    return new ExplorationService(yamlGenerator, sessionStore);
  }, { lifecycle: 'singleton', dependencies: ['yamlGenerator', 'sessionStore'] });

  container.register('validationService', (commandValidator) => {
    const ValidationService = require('../services/ValidationService');
    return new ValidationService(commandValidator);
  }, { lifecycle: 'singleton', dependencies: ['commandValidator'] });

  container.register('persistenceService', (sessionStore) => {
    const PersistenceService = require('../services/PersistenceService');
    return new PersistenceService(sessionStore);
  }, { lifecycle: 'singleton', dependencies: ['sessionStore'] });

  // Utilities
  container.register('imageProcessor', () => {
    const { processScreenshot } = require('../utils/image-processor');
    return { processScreenshot };
  }, { lifecycle: 'singleton' });

  const services = container.getRegisteredServices();
  logger.info(`Registered ${services.length} services:`, services);
  logger.info('Bootstrap complete ✅');
}

function startCleanupTasks() {
  const sessionStore = container.resolve('sessionStore');
  const cacheStore = container.resolve('cacheStore');

  setInterval(() => {
    sessionStore.cleanup(24 * 60 * 60 * 1000);
    cacheStore.cleanup();
  }, 60 * 60 * 1000);

  logger.info('Started cleanup tasks');
}

module.exports = { bootstrap, startCleanupTasks };
