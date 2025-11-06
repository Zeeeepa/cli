const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../../middleware/error-handler');
const container = require('../../core/container');

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
    const { options } = req.body;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      const result = await streamingService.startStreaming(sessionId, options);
      
      res.json({
        success: true,
        message: 'Streaming started successfully',
        sessionId,
        requestId,
        stream: {
          id: result.streamId,
          startedAt: result.startedAt,
          websocketUrl: result.websocketUrl || `ws://localhost:3001?session=${sessionId}`
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        sessionId,
        requestId
      });
    }
  }));

  /**
   * POST /api/v1/sessions/:sessionId/stream/stop
   * Stop streaming for a session
   */
  router.post('/:sessionId/stop', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      const result = await streamingService.stopStreaming(sessionId);
      
      res.json({
        success: true,
        message: 'Streaming stopped successfully',
        sessionId,
        requestId,
        stream: {
          id: result.streamId,
          stoppedAt: result.stoppedAt,
          duration: result.duration,
          eventCount: result.eventCount
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        sessionId,
        requestId
      });
    }
  }));

  /**
   * POST /api/v1/sessions/:sessionId/stream/pause
   * Pause streaming for a session
   */
  router.post('/:sessionId/pause', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      const stream = streamingService.activeStreams.get(sessionId);
      
      if (!stream) {
        return res.status(404).json({
          success: false,
          error: 'No active stream found for this session',
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
          pausedAt: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        sessionId,
        requestId
      });
    }
  }));

  /**
   * POST /api/v1/sessions/:sessionId/stream/resume
   * Resume streaming for a session
   */
  router.post('/:sessionId/resume', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      const stream = streamingService.activeStreams.get(sessionId);
      
      if (!stream) {
        return res.status(404).json({
          success: false,
          error: 'No active stream found for this session',
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
          resumedAt: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        sessionId,
        requestId
      });
    }
  }));

  /**
   * GET /api/v1/sessions/:sessionId/stream/status
   * Get streaming status for a session
   */
  router.get('/:sessionId/status', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      const stream = streamingService.activeStreams.get(sessionId);
      
      if (!stream) {
        return res.status(404).json({
          success: false,
          error: 'No active stream found for this session',
          sessionId,
          requestId,
          stream: null
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
          eventCount: stream.eventCount || 0,
          duration: Date.now() - new Date(stream.startedAt).getTime()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        sessionId,
        requestId
      });
    }
  }));

  return router;
}

module.exports = createRouter;

