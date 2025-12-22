/**
 * Explore Routes  
 * POST /api/v1/explore - Interactive test exploration
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const YAMLGenerator = require('../services/yaml-generator');
const { getLogger } = require('../utils/logger');
const { asyncHandler } = require('../middleware/error-handler');
const { exploreValidation } = require('../middleware/validation');
const { processScreenshot } = require('../utils/image-processor');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

const logger = getLogger('explore-route');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// In-memory session storage (in production, use Redis or database)
const sessions = new Map();

/**
 * POST /api/v1/explore
 * Execute a single test step and add to session
 */
router.post('/', upload.single('screenshot'), exploreValidation, asyncHandler(async (req, res) => {
  const { prompt, session: sessionId = uuidv4() } = req.body;

  logger.info('Explore request:', { prompt, sessionId });

  // Get or create session
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      steps: [],
      created: new Date(),
      updated: new Date()
    };
    sessions.set(sessionId, session);
  }

  // Process screenshot
  let screenshot = null;
  if (req.file) {
    screenshot = await processScreenshot(req.file.buffer.toString('base64'));
  } else if (req.body.screenshot) {
    screenshot = await processScreenshot(req.body.screenshot);
  }

  // Generate command for this prompt
  const generator = new YAMLGenerator();
  const result = await generator.generateCommand(prompt, {
    screenshot,
    previousCommands: session.steps.flatMap(s => s.commands || [])
  });

  // Add to session
  const step = {
    prompt,
    commands: [result.command]
  };
  session.steps.push(step);
  session.updated = new Date();

  res.json({
    success: true,
    sessionId,
    step,
    totalSteps: session.steps.length
  });
}));

/**
 * GET /api/v1/explore/:sessionId
 * Get session details
 */
router.get('/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({
      error: { message: 'Session not found' }
    });
  }

  res.json({
    success: true,
    session
  });
}));

/**
 * DELETE /api/v1/explore/:sessionId
 * Delete session
 */
router.delete('/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const deleted = sessions.delete(sessionId);

  res.json({
    success: deleted,
    message: deleted ? 'Session deleted' : 'Session not found'
  });
}));

module.exports = router;
module.exports.sessions = sessions; // Export sessions for save route
