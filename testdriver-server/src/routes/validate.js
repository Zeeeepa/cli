/**
 * Validation Routes
 * POST /api/v1/validate - Validate YAML test structure
 */

const express = require('express');
const router = express.Router();
const yaml = require('js-yaml');
const { validateCommand } = require('../models/commands');
const { getLogger } = require('../utils/logger');
const { asyncHandler } = require('../middleware/error-handler');
const config = require('../config');

const logger = getLogger('validate-route');

/**
 * POST /api/v1/validate
 * Validate YAML test file
 */
router.post('/', asyncHandler(async (req, res) => {
  const { yaml: yamlContent, content } = req.body;
  
  const input = yamlContent || content;
  
  if (!input) {
    return res.status(400).json({
      error: { message: 'YAML content is required' }
    });
  }

  logger.info('Validating YAML');

  const errors = [];
  const warnings = [];

  try {
    // Parse YAML
    const parsed = yaml.load(input);

    // Check version
    if (!parsed.version) {
      errors.push('Missing version field');
    } else if (parsed.version !== config.testdriver.version) {
      warnings.push(`Version ${parsed.version} differs from current ${config.testdriver.version}`);
    }

    // Check steps
    if (!parsed.steps) {
      errors.push('Missing steps field');
    } else if (!Array.isArray(parsed.steps)) {
      errors.push('Steps must be an array');
    } else {
      // Validate each step
      parsed.steps.forEach((step, index) => {
        if (!step.prompt) {
          warnings.push(`Step ${index + 1}: Missing prompt`);
        }

        if (step.commands) {
          if (!Array.isArray(step.commands)) {
            errors.push(`Step ${index + 1}: Commands must be an array`);
          } else {
            // Validate each command
            step.commands.forEach((command, cmdIndex) => {
              const validation = validateCommand(command);
              if (!validation.valid) {
                errors.push(`Step ${index + 1}, Command ${cmdIndex + 1}: ${validation.errors.join(', ')}`);
              }
            });
          }
        }
      });
    }

    const isValid = errors.length === 0;

    res.json({
      valid: isValid,
      errors,
      warnings,
      parsed: isValid ? parsed : null,
      stepsCount: parsed.steps?.length || 0
    });

  } catch (error) {
    logger.error('YAML parsing error:', error);
    
    res.json({
      valid: false,
      errors: [`YAML syntax error: ${error.message}`],
      warnings: []
    });
  }
}));

/**
 * POST /api/v1/validate/command
 * Validate single command
 */
router.post('/command', asyncHandler(async (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({
      error: { message: 'Command is required' }
    });
  }

  const validation = validateCommand(command);

  res.json({
    valid: validation.valid,
    errors: validation.errors
  });
}));

module.exports = router;

