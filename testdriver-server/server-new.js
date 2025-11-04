#!/usr/bin/env node
/**
 * TestDriver.ai Proxy Server - Production Ready
 * Complete implementation with all TestDriver features
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

// Load configuration
const config = require('./src/config');
const { getLogger } = require('./src/utils/logger');
const { errorHandler, notFoundHandler } = require('./src/middleware/error-handler');

// Import routes
const generateRoutes = require('./src/routes/generate');
const exploreRoutes = require('./src/routes/explore');
const saveRoutes = require('./src/routes/save');
const validateRoutes = require('./src/routes/validate');
const healthRoutes = require('./src/routes/health');

const logger = getLogger('server');

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();

// ============================================================================
// Middleware
// ============================================================================

// Request ID tracking
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  logger.info(`[${req.id}] ${req.method} ${req.path}`);
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

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindow,
  max: config.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res) => {
    logger.warn(`[${req.id}] Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});
app.use('/api/', limiter);

// Request timeout
app.use((req, res, next) => {
  req.setTimeout(120000); // 120 seconds
  res.setTimeout(120000);
  next();
});

// ============================================================================
// Routes
// ============================================================================

// Health checks (no rate limiting)
app.use('/health', healthRoutes);

// API v1 routes
app.use('/api/v1/generate', generateRoutes);
app.use('/api/v1/explore', exploreRoutes);
app.use('/api/v1/save', saveRoutes);
app.use('/api/v1/validate', validateRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TestDriver.ai Proxy Server',
    version: config.testdriver.version,
    status: 'running',
    endpoints: {
      health: '/health',
      generate: 'POST /api/v1/generate',
      explore: 'POST /api/v1/explore',
      save: 'POST /api/v1/save',
      validate: 'POST /api/v1/validate'
    },
    docs: 'https://docs.testdriver.ai'
  });
});

// ============================================================================
// Error Handling
// ============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// Server Start
// ============================================================================

const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info('='.repeat(60));
  logger.info(`🚀 TestDriver Proxy Server Started`);
  logger.info('='.repeat(60));
  logger.info(`Environment: ${config.server.env}`);
  logger.info(`Port: ${PORT}`);
  logger.info(`LLM Provider: ${config.llm.provider}`);
  logger.info(`LLM Model: ${config.llm.model}`);
  logger.info(`Base URL: ${config.llm.baseUrl}`);
  logger.info(`TestDriver Version: ${config.testdriver.version}`);
  logger.info('='.repeat(60));
  logger.info(`API Endpoints:`);
  logger.info(`  POST http://localhost:${PORT}/api/v1/generate - Generate tests`);
  logger.info(`  POST http://localhost:${PORT}/api/v1/explore - Explore interactively`);
  logger.info(`  POST http://localhost:${PORT}/api/v1/save - Save test sessions`);
  logger.info(`  POST http://localhost:${PORT}/api/v1/validate - Validate YAML`);
  logger.info(`  GET  http://localhost:${PORT}/health - Health check`);
  logger.info('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;

