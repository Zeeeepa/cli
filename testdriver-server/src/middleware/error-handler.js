/**
 * Error Handling Middleware
 */

const { getLogger } = require('../utils/logger');

const logger = getLogger('error-handler');

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  logger.error('Request error:', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: {
      message,
      requestId: req.id,
      ...(process.env.DEBUG === 'true' && { stack: err.stack })
    }
  });
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

