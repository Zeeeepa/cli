/**
 * Save Routes
 * POST /api/v1/save - Save test session to YAML file
 */

const express = require('express');
const router = express.Router();
const yaml = require('js-yaml');
const { getLogger } = require('../utils/logger');
const { asyncHandler } = require('../middleware/error-handler');
const { saveValidation } = require('../middleware/validation');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

const logger = getLogger('save-route');

// Access to explore sessions (in production, use shared storage)
const { sessions } = require('./explore');

/**
 * POST /api/v1/save
 * Save current test session to YAML file
 */
router.post('/', saveValidation, asyncHandler(async (req, res) => {
  const { session: sessionData, filename, sessionId } = req.body;

  logger.info('Save request:', { filename, sessionId });

  let steps;
  
  // Get steps from session ID or from provided data
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        error: { message: 'Session not found' }
      });
    }
    steps = session.steps;
  } else if (sessionData) {
    steps = Array.isArray(sessionData) ? sessionData : sessionData.steps;
  } else {
    return res.status(400).json({
      error: { message: 'Either sessionId or session data is required' }
    });
  }

  // Create YAML content
  const yamlContent = yaml.dump({
    version: config.testdriver.version,
    session: sessionId || 'default',
    steps
  });

  // Determine filename
  const testDir = config.storage.testDir;
  await fs.mkdir(testDir, { recursive: true });

  const fileName = filename || `test-${Date.now()}.yaml`;
  const filePath = path.join(testDir, fileName);

  // Write file
  await fs.writeFile(filePath, yamlContent, 'utf8');

  logger.info('Test saved:', { filePath });

  res.json({
    success: true,
    filename: fileName,
    path: filePath,
    yaml: yamlContent,
    stepsCount: steps.length
  });
}));

/**
 * GET /api/v1/save/list
 * List saved test files
 */
router.get('/list', asyncHandler(async (req, res) => {
  const testDir = config.storage.testDir;

  try {
    const files = await fs.readdir(testDir);
    const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    const fileDetails = await Promise.all(
      yamlFiles.map(async (file) => {
        const filePath = path.join(testDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime
        };
      })
    );

    res.json({
      success: true,
      files: fileDetails,
      count: fileDetails.length
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.json({
        success: true,
        files: [],
        count: 0
      });
    }
    throw error;
  }
}));

/**
 * GET /api/v1/save/:filename
 * Get saved test file content
 */
router.get('/:filename', asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(config.storage.testDir, filename);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = yaml.load(content);

    res.json({
      success: true,
      filename,
      yaml: content,
      parsed
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: { message: 'File not found' }
      });
    }
    throw error;
  }
}));

module.exports = router;

