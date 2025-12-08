/**
 * Endpoint Enhancement Utilities for TestDriver Proxy Server
 * 
 * This module provides middleware and utilities for:
 * - Input validation
 * - Error handling
 * - Request/response logging
 * - Timeout management
 * - Retry logic
 */

const { body, validationResult } = require('express-validator');

// ============================================================================
// Validation Middleware
// ============================================================================

/**
 * Validates the main input endpoint parameters
 */
const validateInputEndpoint = [
  body('input')
    .trim()
    .notEmpty().withMessage('input field is required')
    .isLength({ max: 10000 }).withMessage('input must be less than 10000 characters'),
  
  body('mousePosition')
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
          throw new Error('Invalid format');
        }
        return true;
      } catch (error) {
        throw new Error('mousePosition must be a valid JSON object with x and y coordinates');
      }
    }),
  
  body('activeWindow')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('activeWindow must be less than 500 characters'),
  
  body('stream')
    .optional()
    .isBoolean().withMessage('stream must be a boolean'),
  
  body('model')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('model must be less than 100 characters')
];

/**
 * Validates check endpoint parameters
 */
const validateCheckEndpoint = [
  body('task')
    .trim()
    .notEmpty().withMessage('task field is required')
    .isLength({ max: 5000 }).withMessage('task must be less than 5000 characters'),
  
  body('mousePosition')
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
          throw new Error('Invalid format');
        }
        return true;
      } catch (error) {
        throw new Error('mousePosition must be a valid JSON object with x and y coordinates');
      }
    })
];

/**
 * Validates generate endpoint parameters
 */
const validateGenerateEndpoint = [
  body('prompt')
    .trim()
    .notEmpty().withMessage('prompt field is required')
    .isLength({ max: 5000 }).withMessage('prompt must be less than 5000 characters')
];

/**
 * Validates assert endpoint parameters
 */
const validateAssertEndpoint = [
  body('assertion')
    .trim()
    .notEmpty().withMessage('assertion field is required')
    .isLength({ max: 2000 }).withMessage('assertion must be less than 2000 characters')
];

/**
 * Validates hover/text endpoint parameters
 */
const validateHoverTextEndpoint = [
  body('text')
    .trim()
    .notEmpty().withMessage('text field is required')
    .isLength({ max: 500 }).withMessage('text must be less than 500 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('description must be less than 1000 characters')
];

// ============================================================================
// Error Handling Middleware
// ============================================================================

/**
 * Handles validation errors from express-validator
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));
    
    req.logger?.warn('Validation failed:', errorMessages);
    
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request parameters',
      details: errorMessages,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

/**
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };
}

/**
 * Global error handler middleware
 */
function errorHandler(error, req, res, next) {
  const requestId = req.id;
  const logger = req.logger;
  
  logger?.error('Request failed:', {
    requestId,
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Unable to connect to API service. Please try again later.',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  if (error.response?.status === 401) {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid or missing API credentials',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  if (error.response?.status === 429) {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: error.response.headers['retry-after'] || 60,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  // Default error response
  const statusCode = error.statusCode || error.response?.status || 500;
  res.status(statusCode).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
    requestId,
    timestamp: new Date().toISOString()
  });
}

// ============================================================================
// Timeout Middleware
// ============================================================================

/**
 * Sets a timeout for requests
 * @param {number} timeout - Timeout in milliseconds
 */
function timeoutMiddleware(timeout = 30000) {
  return (req, res, next) => {
    req.setTimeout(timeout, () => {
      const error = new Error('Request timeout');
      error.statusCode = 408;
      next(error);
    });
    
    res.setTimeout(timeout, () => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request Timeout',
          message: 'The request took too long to process',
          requestId: req.id,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    next();
  };
}

// ============================================================================
// Retry Logic Utilities
// ============================================================================

/**
 * Retries a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryableErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND']
  } = options;
  
  let lastError;
  let delay = initialDelay;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = 
        retryableErrors.includes(error.code) ||
        (error.response?.status >= 500 && error.response?.status < 600) ||
        error.response?.status === 429;
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay with exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }
  
  throw lastError;
}

// ============================================================================
// Request Sanitization
// ============================================================================

/**
 * Sanitizes user input to prevent injection attacks
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove potential script tags and dangerous characters
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Sanitizes request body
 */
function sanitizeBodyMiddleware(req, res, next) {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }
  next();
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Sends a standardized success response
 */
function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Sends a standardized error response
 */
function sendError(res, message, statusCode = 500, details = null) {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    response.details = details;
  }
  
  res.status(statusCode).json(response);
}

// ============================================================================
// Request Size Limits
// ============================================================================

/**
 * Checks request body size
 */
function checkBodySize(maxSize = 10 * 1024 * 1024) { // 10MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'], 10);
    
    if (contentLength && contentLength > maxSize) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body exceeds maximum size of ${maxSize} bytes`,
        maxSize,
        receivedSize: contentLength,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  // Validation middleware
  validateInputEndpoint,
  validateCheckEndpoint,
  validateGenerateEndpoint,
  validateAssertEndpoint,
  validateHoverTextEndpoint,
  handleValidationErrors,
  
  // Error handling
  asyncHandler,
  errorHandler,
  
  // Timeout
  timeoutMiddleware,
  
  // Retry logic
  retryWithBackoff,
  
  // Sanitization
  sanitizeInput,
  sanitizeBodyMiddleware,
  
  // Response helpers
  sendSuccess,
  sendError,
  
  // Size limits
  checkBodySize
};

