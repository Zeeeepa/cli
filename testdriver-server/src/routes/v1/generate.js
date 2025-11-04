const express = require('express');
const multer = require('multer');
const { asyncHandler } = require('../../middleware/error-handler');
const { generateValidation } = require('../../middleware/validation');
const container = require('../../core/container');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function createRouter() {
  const router = express.Router();
  const testGenerationService = container.resolve('testGenerationService');
  const imageProcessor = container.resolve('imageProcessor');

  router.post('/', upload.single('screenshot'), generateValidation, asyncHandler(async (req, res) => {
    const { description, platform, numSteps, includeSetup } = req.body;

    let screenshot = null;
    if (req.file) {
      screenshot = await imageProcessor.processScreenshot(req.file.buffer.toString('base64'));
    } else if (req.body.screenshot) {
      screenshot = await imageProcessor.processScreenshot(req.body.screenshot);
    }

    let result;
    if (numSteps) {
      result = await testGenerationService.generateExploratorySteps({ description, numSteps });
    } else {
      result = await testGenerationService.generateTest({ description, platform, includeSetup, screenshot });
    }

    res.json(result);
  }));

  router.post('/command', upload.single('screenshot'), asyncHandler(async (req, res) => {
    const { instruction, context } = req.body;

    let screenshot = null;
    if (req.file) {
      screenshot = await imageProcessor.processScreenshot(req.file.buffer.toString('base64'));
    } else if (req.body.screenshot) {
      screenshot = await imageProcessor.processScreenshot(req.body.screenshot);
    }

    const result = await testGenerationService.generateCommand({ instruction, context, screenshot });
    res.json(result);
  }));

  return router;
}

module.exports = createRouter;
