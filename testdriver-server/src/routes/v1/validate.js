const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../../middleware/error-handler');
const container = require('../../core/container');
const { ValidationStartedEvent, ValidationCompletedEvent, ValidationFailedEvent } = require('../../models/events');
const { ValidationError } = require('../../utils/validation');

function createRouter() {
  const router = express.Router();
  const validationService = container.resolve('validationService');
  const eventBus = container.resolve('eventBus');

  router.post('/', asyncHandler(async (req, res) => {
    const { yaml: yamlContent, content, sessionId } = req.body;
    const input = yamlContent || content;
    const requestId = req.headers['x-request-id'] || uuidv4();

    if (!input) {
      throw new ValidationError('YAML content is required', 'content', 'MISSING_REQUIRED_FIELD');
    }

    // Emit validation started event
    const startEvent = new ValidationStartedEvent({
      sessionId: sessionId || 'unknown',
      requestId,
      contentType: 'yaml',
      contentLength: input.length
    });
    await eventBus.emit(startEvent.type, startEvent.data);

    const result = validationService.validateYAML(input);
    
    // Emit validation completed event
    const completeEvent = new ValidationCompletedEvent({
      sessionId: sessionId || 'unknown',
      requestId,
      isValid: result.valid || !result.errors || result.errors.length === 0,
      errorCount: result.errors?.length || 0,
      warningCount: result.warnings?.length || 0,
      durationMs: Date.now() - startEvent.data.timestamp.getTime()
    });
    await eventBus.emit(completeEvent.type, completeEvent.data);
    
    res.json({
      ...result,
      requestId
    });
  }));

  router.post('/command', asyncHandler(async (req, res) => {
    const { command, sessionId } = req.body;
    const requestId = req.headers['x-request-id'] || uuidv4();

    if (!command) {
      throw new ValidationError('Command is required', 'command', 'MISSING_REQUIRED_FIELD');
    }

    // Emit validation started event
    const startEvent = new ValidationStartedEvent({
      sessionId: sessionId || 'unknown',
      requestId,
      contentType: 'command',
      contentLength: command.length
    });
    await eventBus.emit(startEvent.type, startEvent.data);

    const result = validationService.validateCommand(command);
    
    // Emit validation completed event
    const completeEvent = new ValidationCompletedEvent({
      sessionId: sessionId || 'unknown',
      requestId,
      isValid: result.valid || !result.errors || result.errors.length === 0,
      errorCount: result.errors?.length || 0,
      warningCount: result.warnings?.length || 0,
      durationMs: Date.now() - startEvent.data.timestamp.getTime()
    });
    await eventBus.emit(completeEvent.type, completeEvent.data);
    
    res.json({
      ...result,
      requestId
    });
  }));

  return router;
}

module.exports = createRouter;
