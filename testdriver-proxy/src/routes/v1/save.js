const express = require('express');
const { asyncHandler } = require('../../middleware/error-handler');
const { saveValidation } = require('../../middleware/validation');
const container = require('../../core/container');

function createRouter() {
  const router = express.Router();
  const persistenceService = container.resolve('persistenceService');

  router.post('/', saveValidation, asyncHandler(async (req, res) => {
    const { session: sessionData, filename, sessionId } = req.body;
    const result = await persistenceService.saveSession({ sessionId, sessionData, filename });
    res.json(result);
  }));

  router.get('/list', asyncHandler(async (req, res) => {
    const result = await persistenceService.listFiles();
    res.json(result);
  }));

  router.get('/:filename', asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const result = await persistenceService.loadFile(filename);
    res.json(result);
  }));

  router.delete('/:filename', asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const result = await persistenceService.deleteFile(filename);
    res.json(result);
  }));

  return router;
}

module.exports = createRouter;
