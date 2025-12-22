const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../../middleware/error-handler');
const container = require('../../core/container');
const { 
  validateSessionId, 
  validateRecordingOptions,
  sanitizeObject 
} = require('../../utils/validation');

function createRouter() {
  const router = express.Router();
  const recordingService = container.resolve('recordingService');
  const eventBus = container.resolve('eventBus');

  /**
   * POST /api/v1/sessions/:sessionId/recording/start
   * Start recording for a session
   */
  router.post('/:sessionId/start', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Validate input
    validateSessionId(sessionId);
    
    const options = sanitizeObject(req.body.options || {});
    validateRecordingOptions(options);

    const result = await recordingService.startRecording(sessionId, options);
    
    res.json({
      success: true,
      message: 'Recording started successfully',
      sessionId,
      requestId,
      recording: {
        id: result,
        startedAt: Date.now()
      }
    });
  }));

  /**
   * POST /api/v1/sessions/:sessionId/recording/stop
   * Stop recording for a session
   */
  router.post('/:sessionId/stop', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Validate input
    validateSessionId(sessionId);

    const result = await recordingService.stopRecording(sessionId);
    
    // Handle case where no recording was active
    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          message: 'No active recording found for this session',
          code: 'RECORDING_NOT_FOUND'
        },
        sessionId,
        requestId
      });
    }
    
    res.json({
      success: true,
      message: 'Recording stopped successfully',
      sessionId,
      requestId,
      recording: {
        id: result,
        stoppedAt: Date.now()
      }
    });
  }));

  /**
   * GET /api/v1/sessions/:sessionId/recording/status
   * Get recording status for a session
   */
  router.get('/:sessionId/status', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Validate input
    validateSessionId(sessionId);

    const recording = recordingService.activeRecordings.get(sessionId);
    
    if (!recording) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          message: 'No active recording found for this session',
          code: 'RECORDING_NOT_FOUND'
        },
        sessionId,
        requestId
      });
    }

    res.json({
      success: true,
      sessionId,
      requestId,
      recording: {
        id: recording.recordingId,
        startedAt: recording.startedAt,
        screenshotCount: recording.screenshots ? recording.screenshots.length : 0,
        duration: Date.now() - recording.startedAt
      }
    });
  }));

  /**
   * GET /api/v1/sessions/:sessionId/recording/metadata
   * Get recording metadata for a session
   */
  router.get('/:sessionId/metadata', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Validate input
    validateSessionId(sessionId);

    const metadata = await recordingService.getRecordingMetadata(sessionId);
    
    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          message: 'Recording not found',
          code: 'RECORDING_NOT_FOUND'
        },
        sessionId,
        requestId
      });
    }

    res.json({
      success: true,
      sessionId,
      requestId,
      metadata
    });
  }));

  /**
   * DELETE /api/v1/sessions/:sessionId/recording
   * Delete recording for a session
   */
  router.delete('/:sessionId', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Validate input
    validateSessionId(sessionId);

    // Delete recording files
    const result = await recordingService.deleteRecording(sessionId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          message: 'Recording not found',
          code: 'RECORDING_NOT_FOUND'
        },
        sessionId,
        requestId
      });
    }
    
    res.json({
      success: true,
      message: 'Recording deleted successfully',
      sessionId,
      requestId
    });
  }));

  return router;
}

module.exports = createRouter;
