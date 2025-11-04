const express = require('express');
const multer = require('multer');
const { asyncHandler } = require('../../middleware/error-handler');
const { exploreValidation } = require('../../middleware/validation');
const container = require('../../core/container');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function createRouter() {
  const router = express.Router();
  const explorationService = container.resolve('explorationService');
  const imageProcessor = container.resolve('imageProcessor');

  router.post('/', upload.single('screenshot'), exploreValidation, asyncHandler(async (req, res) => {
    const { prompt, session: sessionId } = req.body;

    let screenshot = null;
    if (req.file) {
      screenshot = await imageProcessor.processScreenshot(req.file.buffer.toString('base64'));
    } else if (req.body.screenshot) {
      screenshot = await imageProcessor.processScreenshot(req.body.screenshot);
    }

    const result = await explorationService.executeStep({ prompt, sessionId, screenshot });
    res.json(result);
  }));

  router.get('/sessions', asyncHandler(async (req, res) => {
    const result = await explorationService.listSessions();
    res.json(result);
  }));

  router.get('/:sessionId', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const result = await explorationService.getSession(sessionId);
    res.json(result);
  }));

  router.delete('/:sessionId', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const result = await explorationService.deleteSession(sessionId);
    res.json(result);
  }));

  return router;
}

module.exports = createRouter;
