/**
 * Validation Utilities for API Endpoints
 * Provides comprehensive input validation and sanitization
 */

/**
 * Custom validation error class
 */
class ValidationError extends Error {
  constructor(message, field = null, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
    this.statusCode = 400;
  }
}

/**
 * UUID validation
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate session ID
 */
function validateSessionId(sessionId) {
  if (!sessionId) {
    throw new ValidationError('Session ID is required', 'sessionId', 'MISSING_SESSION_ID');
  }

  if (typeof sessionId !== 'string') {
    throw new ValidationError('Session ID must be a string', 'sessionId', 'INVALID_TYPE');
  }

  if (!isValidUUID(sessionId)) {
    throw new ValidationError('Invalid session ID format', 'sessionId', 'INVALID_FORMAT');
  }

  return true;
}

/**
 * Validate recording options
 */
function validateRecordingOptions(options = {}) {
  if (options && typeof options !== 'object') {
    throw new ValidationError('Recording options must be an object', 'options', 'INVALID_TYPE');
  }

  if (options.title && typeof options.title !== 'string') {
    throw new ValidationError('Recording title must be a string', 'options.title', 'INVALID_TYPE');
  }

  if (options.title && options.title.length > 200) {
    throw new ValidationError('Recording title must be less than 200 characters', 'options.title', 'TOO_LONG');
  }

  if (options.description && typeof options.description !== 'string') {
    throw new ValidationError('Recording description must be a string', 'options.description', 'INVALID_TYPE');
  }

  if (options.description && options.description.length > 1000) {
    throw new ValidationError('Recording description must be less than 1000 characters', 'options.description', 'TOO_LONG');
  }

  if (options.tags && !Array.isArray(options.tags)) {
    throw new ValidationError('Recording tags must be an array', 'options.tags', 'INVALID_TYPE');
  }

  if (options.tags && options.tags.length > 20) {
    throw new ValidationError('Maximum 20 tags allowed', 'options.tags', 'TOO_MANY');
  }

  return true;
}

/**
 * Validate streaming options
 */
function validateStreamingOptions(options = {}) {
  if (options && typeof options !== 'object') {
    throw new ValidationError('Streaming options must be an object', 'options', 'INVALID_TYPE');
  }

  if (options.quality !== undefined) {
    if (typeof options.quality !== 'number') {
      throw new ValidationError('Quality must be a number', 'options.quality', 'INVALID_TYPE');
    }
    if (options.quality < 1 || options.quality > 100) {
      throw new ValidationError('Quality must be between 1 and 100', 'options.quality', 'OUT_OF_RANGE');
    }
  }

  if (options.maxWidth !== undefined) {
    if (typeof options.maxWidth !== 'number') {
      throw new ValidationError('maxWidth must be a number', 'options.maxWidth', 'INVALID_TYPE');
    }
    if (options.maxWidth < 320 || options.maxWidth > 3840) {
      throw new ValidationError('maxWidth must be between 320 and 3840', 'options.maxWidth', 'OUT_OF_RANGE');
    }
  }

  if (options.frameRate !== undefined) {
    if (typeof options.frameRate !== 'number') {
      throw new ValidationError('frameRate must be a number', 'options.frameRate', 'INVALID_TYPE');
    }
    if (options.frameRate < 1 || options.frameRate > 60) {
      throw new ValidationError('frameRate must be between 1 and 60', 'options.frameRate', 'OUT_OF_RANGE');
    }
  }

  return true;
}

/**
 * Validate event query parameters
 */
function validateEventQuery(query = {}) {
  if (query.limit !== undefined) {
    const limit = parseInt(query.limit, 10);
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      throw new ValidationError('Limit must be between 1 and 1000', 'limit', 'OUT_OF_RANGE');
    }
  }

  if (query.offset !== undefined) {
    const offset = parseInt(query.offset, 10);
    if (isNaN(offset) || offset < 0) {
      throw new ValidationError('Offset must be a non-negative number', 'offset', 'INVALID_VALUE');
    }
  }

  if (query.startTime !== undefined) {
    const startTime = parseInt(query.startTime, 10);
    if (isNaN(startTime) || startTime < 0) {
      throw new ValidationError('startTime must be a valid timestamp', 'startTime', 'INVALID_VALUE');
    }
  }

  if (query.endTime !== undefined) {
    const endTime = parseInt(query.endTime, 10);
    if (isNaN(endTime) || endTime < 0) {
      throw new ValidationError('endTime must be a valid timestamp', 'endTime', 'INVALID_VALUE');
    }
  }

  if (query.startTime !== undefined && query.endTime !== undefined) {
    const startTime = parseInt(query.startTime, 10);
    const endTime = parseInt(query.endTime, 10);
    if (endTime < startTime) {
      throw new ValidationError('endTime must be greater than startTime', 'endTime', 'INVALID_RANGE');
    }
  }

  return true;
}

/**
 * Validate test generation request
 */
function validateTestGenerationRequest(body = {}) {
  if (!body.url && !body.description) {
    throw new ValidationError('Either url or description is required', 'body', 'MISSING_REQUIRED_FIELD');
  }

  if (body.url && typeof body.url !== 'string') {
    throw new ValidationError('URL must be a string', 'url', 'INVALID_TYPE');
  }

  if (body.url) {
    try {
      new URL(body.url);
    } catch (error) {
      throw new ValidationError('Invalid URL format', 'url', 'INVALID_FORMAT');
    }
  }

  if (body.description && typeof body.description !== 'string') {
    throw new ValidationError('Description must be a string', 'description', 'INVALID_TYPE');
  }

  if (body.description && body.description.length > 5000) {
    throw new ValidationError('Description must be less than 5000 characters', 'description', 'TOO_LONG');
  }

  if (body.steps !== undefined && !Array.isArray(body.steps)) {
    throw new ValidationError('Steps must be an array', 'steps', 'INVALID_TYPE');
  }

  if (body.steps && body.steps.length > 100) {
    throw new ValidationError('Maximum 100 steps allowed', 'steps', 'TOO_MANY');
  }

  return true;
}

/**
 * Validate exploration request
 */
function validateExplorationRequest(body = {}) {
  if (!body.url) {
    throw new ValidationError('URL is required', 'url', 'MISSING_REQUIRED_FIELD');
  }

  if (typeof body.url !== 'string') {
    throw new ValidationError('URL must be a string', 'url', 'INVALID_TYPE');
  }

  try {
    new URL(body.url);
  } catch (error) {
    throw new ValidationError('Invalid URL format', 'url', 'INVALID_FORMAT');
  }

  if (body.goal && typeof body.goal !== 'string') {
    throw new ValidationError('Goal must be a string', 'goal', 'INVALID_TYPE');
  }

  if (body.goal && body.goal.length > 500) {
    throw new ValidationError('Goal must be less than 500 characters', 'goal', 'TOO_LONG');
  }

  if (body.maxSteps !== undefined) {
    if (typeof body.maxSteps !== 'number') {
      throw new ValidationError('maxSteps must be a number', 'maxSteps', 'INVALID_TYPE');
    }
    if (body.maxSteps < 1 || body.maxSteps > 50) {
      throw new ValidationError('maxSteps must be between 1 and 50', 'maxSteps', 'OUT_OF_RANGE');
    }
  }

  return true;
}

/**
 * Validate save test request
 */
function validateSaveTestRequest(body = {}) {
  if (!body.filename) {
    throw new ValidationError('Filename is required', 'filename', 'MISSING_REQUIRED_FIELD');
  }

  if (typeof body.filename !== 'string') {
    throw new ValidationError('Filename must be a string', 'filename', 'INVALID_TYPE');
  }

  // Check for path traversal attempts
  if (body.filename.includes('..') || body.filename.includes('/') || body.filename.includes('\\')) {
    throw new ValidationError('Invalid filename: path traversal not allowed', 'filename', 'SECURITY_VIOLATION');
  }

  if (!body.filename.endsWith('.yml') && !body.filename.endsWith('.yaml')) {
    throw new ValidationError('Filename must end with .yml or .yaml', 'filename', 'INVALID_FORMAT');
  }

  if (!body.content) {
    throw new ValidationError('Content is required', 'content', 'MISSING_REQUIRED_FIELD');
  }

  if (typeof body.content !== 'string') {
    throw new ValidationError('Content must be a string', 'content', 'INVALID_TYPE');
  }

  if (body.content.length > 1000000) {
    throw new ValidationError('Content must be less than 1MB', 'content', 'TOO_LARGE');
  }

  return true;
}

/**
 * Validate command validation request
 */
function validateCommandValidationRequest(body = {}) {
  if (!body.command) {
    throw new ValidationError('Command is required', 'command', 'MISSING_REQUIRED_FIELD');
  }

  if (typeof body.command !== 'object') {
    throw new ValidationError('Command must be an object', 'command', 'INVALID_TYPE');
  }

  if (!body.command.type) {
    throw new ValidationError('Command type is required', 'command.type', 'MISSING_REQUIRED_FIELD');
  }

  if (typeof body.command.type !== 'string') {
    throw new ValidationError('Command type must be a string', 'command.type', 'INVALID_TYPE');
  }

  return true;
}

/**
 * Sanitize string input
 */
function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== 'string') {
    return '';
  }
  
  // Remove null bytes and control characters except newlines and tabs
  let sanitized = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized.trim();
}

/**
 * Sanitize object keys to prevent prototype pollution
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = {};
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  for (const key of Object.keys(obj)) {
    if (!dangerousKeys.includes(key)) {
      sanitized[key] = obj[key];
    }
  }

  return sanitized;
}

module.exports = {
  ValidationError,
  validateSessionId,
  validateRecordingOptions,
  validateStreamingOptions,
  validateEventQuery,
  validateTestGenerationRequest,
  validateExplorationRequest,
  validateSaveTestRequest,
  validateCommandValidationRequest,
  sanitizeString,
  sanitizeObject,
  isValidUUID
};

