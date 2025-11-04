/**
 * Logging Utility
 * Winston-based logger with proper formatting
 */

const winston = require('winston');
const config = require('../config');
const path = require('path');
const fs = require('fs');

// Ensure log directory exists
const logDir = config.storage.logDir;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create base logger
const baseLogger = winston.createLogger({
  level: config.server.debug ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    })
  ]
});

// Add console transport in development
if (config.server.env !== 'production') {
  baseLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
        const metaStr = Object.keys(meta).length > 0 
          ? '\n' + JSON.stringify(meta, null, 2) 
          : '';
        const serviceStr = service ? `[${service}]` : '';
        return `${timestamp} ${level} ${serviceStr}: ${message}${metaStr}`;
      })
    )
  }));
}

/**
 * Create child logger with service name
 */
function getLogger(serviceName) {
  return baseLogger.child({ service: serviceName });
}

module.exports = { getLogger, baseLogger };

