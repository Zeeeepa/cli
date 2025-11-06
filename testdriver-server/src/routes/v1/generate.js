const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../../middleware/error-handler');
const { generateValidation } = require('../../middleware/validation');
const container = require('../../core/container');
const { TestGenerationStartedEvent, TestGenerationCompletedEvent, TestGenerationFailedEvent } = require('../../models/events');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function createRouter() {
  const router = express.Router();
  const testGenerationService = container.resolve('testGenerationService');
  const imageProcessor = container.resolve('imageProcessor');
  const eventBus = container.resolve('eventBus');

  router.post('/', upload.single('screenshot'), generateValidation, asyncHandler(async (req, res) => {
    const { description, platform, numSteps, includeSetup } = req.body;
    const sessionId = req.body.sessionId || uuidv4();
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Emit test generation started event
    const startEvent = new TestGenerationStartedEvent({
      sessionId,
      requestId,
      description,
      platform: platform || 'web',
      includeSetup: includeSetup !== false,
      hasScreenshot: !!(req.file || req.body.screenshot),
      isExploratory: !!numSteps
    });
    await eventBus.emit(startEvent.type, startEvent.data);

    try {
      let screenshot = null;
      if (req.file) {
        screenshot = await imageProcessor.processScreenshot(req.file.buffer.toString('base64'));
      } else if (req.body.screenshot) {
        screenshot = await imageProcessor.processScreenshot(req.body.screenshot);
      }

      let result;
      if (numSteps) {
        result = await testGenerationService.generateExploratorySteps({ 
          description, 
          numSteps,
          sessionId,
          requestId
        });
      } else {
        result = await testGenerationService.generateTest({ 
          description, 
          platform, 
          includeSetup, 
          screenshot,
          sessionId,
          requestId
        });
      }

      // Emit test generation completed event
      const completeEvent = new TestGenerationCompletedEvent({
        sessionId,
        requestId,
        testYaml: result.yaml,
        stepCount: result.steps?.length || 0,
        durationMs: Date.now() - startEvent.data.timestamp.getTime()
      });
      await eventBus.emit(completeEvent.type, completeEvent.data);

      res.json({
        ...result,
        sessionId,
        requestId
      });
    } catch (error) {
      // Emit test generation failed event
      const failEvent = new TestGenerationFailedEvent({
        sessionId,
        requestId,
        error: error.message,
        errorCode: error.code || 'GENERATION_ERROR',
        errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      await eventBus.emit(failEvent.type, failEvent.data);
      
      throw error;
    }
  }));

  router.post('/command', upload.single('screenshot'), asyncHandler(async (req, res) => {
    const { instruction, context } = req.body;
    const sessionId = req.body.sessionId || uuidv4();
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Emit command generation started event
    const { CommandGenerationStartedEvent, CommandGenerationCompletedEvent, CommandGenerationFailedEvent } = require('../../models/events');
    const startEvent = new CommandGenerationStartedEvent({
      sessionId,
      requestId,
      instruction,
      hasContext: !!context,
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

      const result = await testGenerationService.generateCommand({ 
        instruction, 
        context, 
        screenshot,
        sessionId,
        requestId
      });

      // Emit command generation completed event
      const completeEvent = new CommandGenerationCompletedEvent({
        sessionId,
        requestId,
        command: result.command,
        durationMs: Date.now() - startEvent.data.timestamp.getTime()
      });
      await eventBus.emit(completeEvent.type, completeEvent.data);

      res.json({
        ...result,
        sessionId,
        requestId
      });
    } catch (error) {
      // Emit command generation failed event
      const failEvent = new CommandGenerationFailedEvent({
        sessionId,
        requestId,
        error: error.message,
        errorCode: error.code || 'COMMAND_GENERATION_ERROR'
      });
      await eventBus.emit(failEvent.type, failEvent.data);
      
      throw error;
    }
  }));

  return router;
}

module.exports = createRouter;
