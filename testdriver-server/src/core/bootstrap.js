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

  // Event System - Register first so other services can use it
  container.register('eventStore', () => {
    const EventStore = require('../stores/EventStore');
    const eventStore = new EventStore({
      storageDir: config.EVENT_STORAGE_DIR || './data/events',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      compression: true
    });
    // Initialize asynchronously
    eventStore.initialize().catch(err => {
      logger.error('Failed to initialize EventStore', { error: err.message });
    });
    return eventStore;
  }, { lifecycle: 'singleton' });

  container.register('eventBus', (eventStore) => {
    const EventBus = require('../core/EventBus');
    return new EventBus({
      maxLogSize: 1000,
      persistence: eventStore
    });
  }, { lifecycle: 'singleton', dependencies: ['eventStore'] });

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

  // Phase 2A Services - Advanced Features
  container.register('recordingService', (eventBus) => {
    const RecordingService = require('../services/RecordingService');
    const service = new RecordingService(eventBus, {
      storageDir: config.RECORDING_STORAGE_DIR || './data/recordings',
      autoStart: config.RECORDING_AUTO_START !== false
    });
    // Initialize asynchronously
    service.initialize().catch(err => {
      logger.error('Failed to initialize RecordingService', { error: err.message });
    });
    return service;
  }, { lifecycle: 'singleton', dependencies: ['eventBus'] });

  // Note: WebSocketService and StreamingService are registered separately
  // after HTTP server is created (see server.js)

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
