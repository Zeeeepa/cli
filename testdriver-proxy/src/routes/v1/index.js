const express = require('express');
const { getLogger } = require('../../utils/logger');

const logger = getLogger('routes-v1');

function createV1Router() {
  const router = express.Router();

  logger.info('Initializing v1 routes...');

  const createGenerateRouter = require('./generate');
  const createExploreRouter = require('./explore');
  const createSaveRouter = require('./save');
  const createValidateRouter = require('./validate');
  const createHealthRouter = require('./health');

  router.use('/generate', createGenerateRouter());
  router.use('/explore', createExploreRouter());
  router.use('/save', createSaveRouter());
  router.use('/validate', createValidateRouter());
  router.use('/health', createHealthRouter());

  router.get('/', (req, res) => {
    res.json({
      version: 'v1',
      endpoints: {
        generate: 'POST /api/v1/generate',
        generateCommand: 'POST /api/v1/generate/command',
        explore: 'POST /api/v1/explore',
        exploreSessions: 'GET /api/v1/explore/sessions',
        exploreSession: 'GET /api/v1/explore/:sessionId',
        save: 'POST /api/v1/save',
        saveList: 'GET /api/v1/save/list',
        saveGet: 'GET /api/v1/save/:filename',
        validate: 'POST /api/v1/validate',
        validateCommand: 'POST /api/v1/validate/command',
        health: 'GET /api/v1/health',
        healthDetailed: 'GET /api/v1/health/detailed',
        healthServices: 'GET /api/v1/health/services'
      }
    });
  });

  logger.info('v1 routes initialized ✅');

  return router;
}

module.exports = createV1Router;
