/**
 * Health Check Routes
 * GET /health - System health check
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const LLMProvider = require('../services/llm-provider');

/**
 * GET /health
 * Basic health check
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: config.testdriver.version,
    env: config.server.env
  });
});

/**
 * GET /health/detailed
 * Detailed health check with LLM connectivity
 */
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: config.testdriver.version,
    env: config.server.env,
    checks: {
      config: 'ok',
      llm: 'checking'
    }
  };

  // Test LLM connectivity
  try {
    const llm = new LLMProvider();
    const testResponse = await llm.call(
      [{ role: 'user', content: 'Say "ok"' }],
      'You are a health check assistant. Respond with just "ok".',
      { retries: 1 }
    );
    
    health.checks.llm = 'ok';
    health.llmProvider = config.llm.provider;
    health.llmModel = config.llm.model;
  } catch (error) {
    health.checks.llm = 'error';
    health.llmError = error.message;
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;

