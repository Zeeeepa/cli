/**
 * Error Handling Middleware
 */

const { getLogger } = require('../utils/logger');
const { ValidationError } = require('../utils/validation');

const logger = getLogger('error-handler');

/**
 * Categorize error by type
 */
function categorizeError(err) {
  // Validation errors
  if (err instanceof ValidationError || err.name === 'ValidationError') {
    return {
      type: 'validation_error',
      statusCode: 400,
      userMessage: err.message,
      field: err.field,
      code: err.code
    };
  }

  // Not found errors
  if (err.statusCode === 404 || err.name === 'NotFoundError') {
    return {
      type: 'not_found',
      statusCode: 404,
      userMessage: err.message || 'Resource not found',
      code: 'RESOURCE_NOT_FOUND'
    };
  }

  // Unauthorized errors
  if (err.statusCode === 401 || err.name === 'UnauthorizedError') {
    return {
      type: 'unauthorized',
      statusCode: 401,
      userMessage: 'Unauthorized access',
      code: 'UNAUTHORIZED'
    };
  }

  // Forbidden errors
  if (err.statusCode === 403 || err.name === 'ForbiddenError') {
    return {
      type: 'forbidden',
      statusCode: 403,
      userMessage: 'Access forbidden',
      code: 'FORBIDDEN'
    };
  }

  // Rate limit errors
  if (err.statusCode === 429 || err.name === 'RateLimitError') {
    return {
      type: 'rate_limit',
      statusCode: 429,
      userMessage: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED'
    };
  }

  // Service unavailable
  if (err.statusCode === 503 || err.name === 'ServiceUnavailableError') {
    return {
      type: 'service_unavailable',
      statusCode: 503,
      userMessage: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE'
    };
  }

  // Default to internal server error
  return {
    type: 'internal_error',
    statusCode: err.statusCode || 500,
    userMessage: process.env.NODE_ENV === 'production' 
      ? 'An internal error occurred' 
      : err.message,
    code: 'INTERNAL_ERROR'
  };
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  const errorCategory = categorizeError(err);

  // Log error with appropriate level
  const logLevel = errorCategory.statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Request error:', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    type: errorCategory.type,
    statusCode: errorCategory.statusCode,
    error: err.message,
    field: errorCategory.field,
    code: errorCategory.code,
    ...(logLevel === 'error' && { stack: err.stack })
  });

  // Build error response
  const errorResponse = {
    success: false,
    error: {
      type: errorCategory.type,
      message: errorCategory.userMessage,
      code: errorCategory.code,
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  };

  // Add field info for validation errors
  if (errorCategory.field) {
    errorResponse.error.field = errorCategory.field;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production' && errorCategory.statusCode >= 500) {
    errorResponse.error.stack = err.stack;
  }

  res.status(errorCategory.statusCode).json(errorResponse);
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.path,
      method: req.method
    }
  });
}

/**
 * Async route wrapper to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
