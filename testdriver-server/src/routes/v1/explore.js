const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../../middleware/error-handler');
const { exploreValidation } = require('../../middleware/validation');
const container = require('../../core/container');
const { 
  ExplorationStartedEvent, 
  ExplorationStepCompletedEvent, 
  ExplorationStepFailedEvent,
  SessionCreatedEvent,
  SessionDeletedEvent 
} = require('../../models/events');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function createRouter() {
  const router = express.Router();
  const explorationService = container.resolve('explorationService');
  const imageProcessor = container.resolve('imageProcessor');
  const eventBus = container.resolve('eventBus');

  router.post('/', upload.single('screenshot'), exploreValidation, asyncHandler(async (req, res) => {
    const { prompt, session: sessionId } = req.body;
    const requestId = req.headers['x-request-id'] || uuidv4();
    const isNewSession = !sessionId;

    // Emit session created event if new session
    if (isNewSession) {
      const sessionCreatedEvent = new SessionCreatedEvent({
        sessionId: sessionId || 'auto-generated',
        sessionType: 'exploration',
        metadata: { prompt }
      });
      await eventBus.emit(sessionCreatedEvent.type, sessionCreatedEvent.data);
    }

    // Emit exploration started event
    const startEvent = new ExplorationStartedEvent({
      sessionId: sessionId || 'auto-generated',
      requestId,
      prompt,
      hasScreenshot: !!(req.file || req.body.screenshot)
    });
    await eventBus.emit(startEvent.type, startEvent.data);

    try {
      let screenshot = null;
      if (req.file) {
        screenshot = await imageProcessor.processScreenshot(req.file.buffer.toString('base64'));
      } else if (req.body.screenshot) {
        screenshot = await imageProcessor.processScreenshot(req.body.screenshot);
      }

      const result = await explorationService.executeStep({ prompt, sessionId, screenshot, requestId });

      // Emit exploration step completed event
      const completeEvent = new ExplorationStepCompletedEvent({
        sessionId: result.sessionId || sessionId,
        requestId,
        stepNumber: result.stepNumber || 1,
        command: result.command,
        durationMs: Date.now() - startEvent.data.timestamp.getTime()
      });
      await eventBus.emit(completeEvent.type, completeEvent.data);

      res.json({
        ...result,
        requestId
      });
    } catch (error) {
      // Emit exploration step failed event
      const failEvent = new ExplorationStepFailedEvent({
        sessionId: sessionId || 'unknown',
        requestId,
        error: error.message,
        errorCode: error.code || 'EXPLORATION_ERROR'
      });
      await eventBus.emit(failEvent.type, failEvent.data);
      
      throw error;
    }
  }));

  router.get('/sessions', asyncHandler(async (req, res) => {
    const result = await explorationService.listSessions();
    res.json(result);
  }));

  router.get('/:sessionId', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const result = await explorationService.getSession(sessionId);
    res.json(result);
  }));

  router.delete('/:sessionId', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    try {
      const result = await explorationService.deleteSession(sessionId);
      
      // Emit session deleted event
      const deletedEvent = new SessionDeletedEvent({
        sessionId,
        sessionType: 'exploration',
        metadata: { deletedAt: new Date() }
      });
      await eventBus.emit(deletedEvent.type, deletedEvent.data);
      
      res.json(result);
    } catch (error) {
      throw error;
    }
  }));

  return router;
}

module.exports = createRouter;
