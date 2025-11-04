const express = require('express');
const config = require('../../config');
const container = require('../../core/container');

function createRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: config.testdriver.version,
      env: config.server.env
    });
  });

  router.get('/detailed', async (req, res) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: config.testdriver.version,
      env: config.server.env,
      checks: { config: 'ok', llm: 'checking', container: 'ok' }
    };

    try {
      const services = container.getRegisteredServices();
      health.services = services;
      health.serviceCount = services.length;
    } catch (error) {
      health.checks.container = 'error';
      health.containerError = error.message;
      health.status = 'degraded';
    }

    try {
      const llmProvider = container.resolve('llmProvider');
      const testResponse = await llmProvider.call(
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

  router.get('/services', (req, res) => {
    const services = container.getRegisteredServices();
    res.json({ success: true, services, count: services.length });
  });

  return router;
}

module.exports = createRouter;
