const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../../middleware/error-handler');
const container = require('../../core/container');
const { 
  validateSessionId, 
  validateStreamingOptions,
  sanitizeObject 
} = require('../../utils/validation');

function createRouter() {
  const router = express.Router();
  const streamingService = container.resolve('streamingService');
  const eventBus = container.resolve('eventBus');

  /**
   * POST /api/v1/sessions/:sessionId/stream/start
   * Start streaming for a session
   */
  router.post('/:sessionId/start', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Validate input
    validateSessionId(sessionId);
    
    const options = sanitizeObject(req.body.options || {});
    validateStreamingOptions(options);

    const result = await streamingService.startStreaming(sessionId, options);
    
    res.json({
      success: true,
      message: 'Streaming started successfully',
      sessionId,
      requestId,
      stream: {
        id: result,
        startedAt: Date.now(),
        websocketUrl: `ws://localhost:3001?session=${sessionId}`
      }
    });
  }));

  /**
   * POST /api/v1/sessions/:sessionId/stream/stop
   * Stop streaming for a session
   */
  router.post('/:sessionId/stop', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Validate input
    validateSessionId(sessionId);

    const result = await streamingService.stopStreaming(sessionId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          message: 'No active stream found for this session',
          code: 'STREAM_NOT_FOUND'
        },
        sessionId,
        requestId
      });
    }
    
    res.json({
      success: true,
      message: 'Streaming stopped successfully',
      sessionId,
      requestId,
      stream: {
        id: result,
        stoppedAt: Date.now()
      }
    });
  }));

  /**
   * POST /api/v1/sessions/:sessionId/stream/pause
   * Pause streaming for a session
   */
  router.post('/:sessionId/pause', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Validate input
    validateSessionId(sessionId);

    const stream = streamingService.activeStreams.get(sessionId);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          message: 'No active stream found for this session',
          code: 'STREAM_NOT_FOUND'
        },
        sessionId,
        requestId
      });
    }

    stream.isPaused = true;
    
    res.json({
      success: true,
      message: 'Streaming paused successfully',
      sessionId,
      requestId,
      stream: {
        id: stream.streamId,
        isPaused: true,
        pausedAt: Date.now()
      }
    });
  }));

  /**
   * POST /api/v1/sessions/:sessionId/stream/resume
   * Resume streaming for a session
   */
  router.post('/:sessionId/resume', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Validate input
    validateSessionId(sessionId);

    const stream = streamingService.activeStreams.get(sessionId);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          message: 'No active stream found for this session',
          code: 'STREAM_NOT_FOUND'
        },
        sessionId,
        requestId
      });
    }

    stream.isPaused = false;
    
    res.json({
      success: true,
      message: 'Streaming resumed successfully',
      sessionId,
      requestId,
      stream: {
        id: stream.streamId,
        isPaused: false,
        resumedAt: Date.now()
      }
    });
  }));

  /**
   * GET /api/v1/sessions/:sessionId/stream/status
   * Get streaming status for a session
   */
  router.get('/:sessionId/status', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Validate input
    validateSessionId(sessionId);

    const stream = streamingService.activeStreams.get(sessionId);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          message: 'No active stream found for this session',
          code: 'STREAM_NOT_FOUND'
        },
        sessionId,
        requestId
      });
    }

    res.json({
      success: true,
      sessionId,
      requestId,
      stream: {
        id: stream.streamId,
        isActive: stream.isActive,
        isPaused: stream.isPaused,
        startedAt: stream.startedAt,
        connectedClients: stream.connectedClients || 0,
        duration: Date.now() - stream.startedAt
      }
    });
  }));

  return router;
}

module.exports = createRouter;
