const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../../middleware/error-handler');
const { saveValidation } = require('../../middleware/validation');
const container = require('../../core/container');
const { TestSavedEvent, TestLoadedEvent, TestDeletedEvent } = require('../../models/events');

function createRouter() {
  const router = express.Router();
  const persistenceService = container.resolve('persistenceService');
  const eventBus = container.resolve('eventBus');

  router.post('/', saveValidation, asyncHandler(async (req, res) => {
    const { session: sessionData, filename, sessionId } = req.body;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      const result = await persistenceService.saveSession({ sessionId, sessionData, filename });
      
      // Emit test saved event
      const savedEvent = new TestSavedEvent({
        sessionId: sessionId || 'unknown',
        requestId,
        filename: result.filename || filename,
        filePath: result.path,
        stepCount: sessionData?.steps?.length || 0
      });
      await eventBus.emit(savedEvent.type, savedEvent.data);
      
      res.json({
        ...result,
        requestId
      });
    } catch (error) {
      throw error;
    }
  }));

  router.get('/list', asyncHandler(async (req, res) => {
    const result = await persistenceService.listFiles();
    res.json(result);
  }));

  router.get('/:filename', asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();
    
    try {
      const result = await persistenceService.loadFile(filename);
      
      // Emit test loaded event
      const loadedEvent = new TestLoadedEvent({
        sessionId: result.sessionId || 'unknown',
        requestId,
        filename,
        filePath: result.path,
        stepCount: result.session?.steps?.length || 0
      });
      await eventBus.emit(loadedEvent.type, loadedEvent.data);
      
      res.json({
        ...result,
        requestId
      });
    } catch (error) {
      throw error;
    }
  }));

  router.delete('/:filename', asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();
    
    try {
      const result = await persistenceService.deleteFile(filename);
      
      // Emit test deleted event
      const deletedEvent = new TestDeletedEvent({
        sessionId: 'unknown',
        requestId,
        filename,
        filePath: result.path
      });
      await eventBus.emit(deletedEvent.type, deletedEvent.data);
      
      res.json({
        ...result,
        requestId
      });
    } catch (error) {
      throw error;
    }
  }));

  return router;
}

module.exports = createRouter;
