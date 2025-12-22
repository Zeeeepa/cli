/**
 * Request Validation Middleware
 */

const { body, validationResult } = require('express-validator');

/**
 * Validate request and return errors
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  
  next();
}

/**
 * Validation rules for test generation
 */
const generateValidation = [
  body('description').notEmpty().withMessage('Description is required'),
  body('platform').optional().isIn(['web', 'desktop', 'mobile']).withMessage('Invalid platform'),
  body('numSteps').optional().isInt({ min: 1, max: 20 }).withMessage('Number of steps must be between 1 and 20'),
  validate
];

/**
 * Validation rules for command generation
 */
const commandValidation = [
  body('instruction').notEmpty().withMessage('Instruction is required'),
  validate
];

/**
 * Validation rules for explore
 */
const exploreValidation = [
  body('prompt').notEmpty().withMessage('Prompt is required'),
  validate
];

/**
 * Validation rules for save
 */
const saveValidation = [
  body('session').notEmpty().withMessage('Session is required'),
  body('filename').optional().isString().withMessage('Filename must be a string'),
  validate
];

module.exports = {
  validate,
  generateValidation,
  commandValidation,
  exploreValidation,
  saveValidation
};

