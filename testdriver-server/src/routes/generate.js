/**
 * Test Generation Routes
 * POST /api/v1/generate - Generate complete tests from natural language
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const YAMLGenerator = require('../services/yaml-generator');
const { getLogger } = require('../utils/logger');
const { asyncHandler } = require('../middleware/error-handler');
const { generateValidation } = require('../middleware/validation');
const { processScreenshot } = require('../utils/image-processor');

const logger = getLogger('generate-route');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * POST /api/v1/generate
 * Generate complete YAML test from natural language
 */
router.post('/', upload.single('screenshot'), generateValidation, asyncHandler(async (req, res) => {
  const { description, platform = 'web', numSteps, includeSetup = true } = req.body;
  
  logger.info('Generate request:', { description, platform, numSteps });

  // Process screenshot if provided
  let screenshot = null;
  if (req.file) {
    screenshot = await processScreenshot(req.file.buffer.toString('base64'));
  } else if (req.body.screenshot) {
    screenshot = await processScreenshot(req.body.screenshot);
  }

  const generator = new YAMLGenerator();
  
  // Generate exploratory or complete test
  let result;
  if (numSteps) {
    // Generate exploratory test (prompts only)
    result = await generator.generateExploratorySteps(description, parseInt(numSteps));
    
    res.json({
      success: true,
      type: 'exploratory',
      steps: result.steps,
      yaml: result.yaml
    });
  } else {
    // Generate complete test with commands
    result = await generator.generateTest(description, {
      platform,
      includeSetup,
      screenshot
    });

    res.json({
      success: true,
      type: 'complete',
      yaml: result.yaml,
      parsed: result.parsed
    });
  }
}));

/**
 * POST /api/v1/generate/command
 * Generate single command from instruction
 */
router.post('/command', upload.single('screenshot'), asyncHandler(async (req, res) => {
  const { instruction, context = {} } = req.body;

  logger.info('Generate command:', { instruction });

  // Process screenshot
  let screenshot = null;
  if (req.file) {
    screenshot = await processScreenshot(req.file.buffer.toString('base64'));
  } else if (req.body.screenshot) {
    screenshot = await processScreenshot(req.body.screenshot);
  }

  const generator = new YAMLGenerator();
  const result = await generator.generateCommand(instruction, {
    ...context,
    screenshot
  });

  res.json({
    success: true,
    command: result.command,
    raw: result.raw
  });
}));

module.exports = router;

