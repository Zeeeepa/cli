#!/usr/bin/env node
/**
 * TestDriver.ai Proxy Server - Refactored Architecture
 * 
 * Features:
 * - Dependency Injection Container
 * - Centralized State Management
 * - Service Layer Architecture
 * - API Versioning
 * - Clean Separation of Concerns
 * 
 * Usage:
 *   npm start
 *   TD_API_ROOT=http://localhost:3000 npx testdriverai run test.yaml
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// Core imports
const config = require('./src/config');
const { bootstrap, startCleanupTasks } = require('./src/core/bootstrap');
const { getLogger } = require('./src/utils/logger');
const { errorHandler, notFoundHandler } = require('./src/middleware/error-handler');

const logger = getLogger('server');

// ============================================================================
// BOOTSTRAP APPLICATION
// ============================================================================

logger.info('Starting TestDriver Proxy Server...');

// Register all services in the container
bootstrap();

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Request ID tracking
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// CORS
app.use(cors({
  origin: config.security.allowedOrigins,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan('combined', { 
  stream: { write: msg => logger.info(msg.trim()) } 
}));

// Rate limiting (only for API routes)
const apiLimiter = rateLimit({
  windowMs: config.security.rateLimitWindow,
  max: config.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded - IP: ${req.ip}, Request ID: ${req.id}`);
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

// Request timeout
app.use((req, res, next) => {
  req.setTimeout(120000); // 120 seconds
  res.setTimeout(120000);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TestDriver.ai Proxy Server',
    version: config.testdriver.version,
    architecture: 'refactored-v2',
    status: 'running',
    features: [
      'Dependency Injection',
      'Service Layer Pattern',
      'API Versioning',
      'Centralized State Management'
    ],
    endpoints: {
      apiV1: '/api/v1',
      health: '/health',
      docs: 'https://docs.testdriver.ai'
    }
  });
});

// Health check (no rate limiting, separate from API)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: config.testdriver.version,
    env: config.server.env
  });
});

// API v1 routes (with rate limiting)
const createV1Router = require('./src/routes/v1');
app.use('/api/v1', apiLimiter, createV1Router());

// Legacy compatibility - redirect old paths to v1
app.use('/api/generate', (req, res, next) => {
  req.url = '/api/v1/generate' + req.url.substring(0);
  next();
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// SERVER START
// ============================================================================

const PORT = config.server.port;

const server = app.listen(PORT, async () => {
  logger.info('═'.repeat(70));
  logger.info('🚀  TestDriver Server Started - Phase 2A Features Enabled');
  logger.info('═'.repeat(70));
  logger.info(`Environment:        ${config.server.env}`);
  logger.info(`Port:               ${PORT}`);
  logger.info(`LLM Provider:       ${config.llm.provider}`);
  logger.info(`LLM Model:          ${config.llm.model}`);
  logger.info(`Base URL:           ${config.llm.baseUrl}`);
  logger.info(`TestDriver Version: ${config.testdriver.version}`);
  logger.info('─'.repeat(70));
  logger.info('Architecture:       Event-Driven + Service Layer + DI');
  logger.info('State Management:   Centralized Stores + Event Bus');
  logger.info('API Version:        v1 (versioned)');
  logger.info('═'.repeat(70));
  logger.info('Phase 2A Features:');
  logger.info('  ✅  Event System (40+ event types)');
  logger.info('  ✅  WebSocket Streaming (real-time)');
  logger.info('  ✅  Session Recording (dashcam-style)');
  logger.info('  ✅  Advanced Session Management');
  logger.info('═'.repeat(70));
  logger.info('API Endpoints:');
  logger.info(`  GET  http://localhost:${PORT}/             - Server info`);
  logger.info(`  GET  http://localhost:${PORT}/health       - Health check`);
  logger.info(`  GET  http://localhost:${PORT}/api/v1       - API v1 info`);
  logger.info(`  POST http://localhost:${PORT}/api/v1/generate - Generate tests`);
  logger.info(`  POST http://localhost:${PORT}/api/v1/explore  - Explore mode`);
  logger.info(`  POST http://localhost:${PORT}/api/v1/save     - Save tests`);
  logger.info(`  POST http://localhost:${PORT}/api/v1/validate - Validate YAML`);
  logger.info('═'.repeat(70));

  // Initialize Phase 2A Services with HTTP server
  try {
    const container = require('./src/core/container');
    const eventBus = container.resolve('eventBus');
    
    // Initialize WebSocket service
    const WebSocketService = require('./src/services/WebSocketService');
    const webSocketService = new WebSocketService(server, eventBus);
    await webSocketService.initialize();
    container.registerInstance('webSocketService', webSocketService);
    
    // Initialize Streaming service
    const StreamingService = require('./src/services/StreamingService');
    const streamingService = new StreamingService(eventBus, webSocketService);
    await streamingService.initialize();
    container.registerInstance('streamingService', streamingService);
    
    logger.info('✅  WebSocket & Streaming services initialized');
    logger.info(`    WebSocket endpoint: ws://localhost:${PORT}`);
  } catch (error) {
    logger.error('Failed to initialize Phase 2A services:', error);
  }

  // Start cleanup tasks
  startCleanupTasks();
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

function shutdown() {
  logger.info('Shutting down gracefully...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
