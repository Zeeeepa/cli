const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../../middleware/error-handler');
const container = require('../../core/container');

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
    const { options } = req.body;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      const result = await recordingService.startRecording(sessionId, options);
      
      res.json({
        success: true,
        message: 'Recording started successfully',
        sessionId,
        requestId,
        recording: {
          id: result.recordingId,
          startedAt: result.startedAt,
          outputDir: result.outputDir
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
   * POST /api/v1/sessions/:sessionId/recording/stop
   * Stop recording for a session
   */
  router.post('/:sessionId/stop', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      const result = await recordingService.stopRecording(sessionId);
      
      res.json({
        success: true,
        message: 'Recording stopped successfully',
        sessionId,
        requestId,
        recording: {
          id: result.recordingId,
          stoppedAt: result.stoppedAt,
          duration: result.duration,
          eventCount: result.eventCount,
          outputPath: result.outputPath
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
   * GET /api/v1/sessions/:sessionId/recording/status
   * Get recording status for a session
   */
  router.get('/:sessionId/status', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      const recording = recordingService.activeRecordings.get(sessionId);
      
      if (!recording) {
        return res.status(404).json({
          success: false,
          error: 'No active recording found for this session',
          sessionId,
          requestId,
          recording: null
        });
      }

      res.json({
        success: true,
        sessionId,
        requestId,
        recording: {
          id: recording.recordingId,
          isRecording: recording.isRecording,
          startedAt: recording.startedAt,
          eventCount: recording.events.length,
          screenshotCount: recording.screenshots.length,
          duration: Date.now() - new Date(recording.startedAt).getTime(),
          outputDir: recording.outputDir
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
   * GET /api/v1/sessions/:sessionId/recording/download
   * Download recording archive for a session
   */
  router.get('/:sessionId/download', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { format = 'zip' } = req.query;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      // Get recording metadata
      const metadata = await recordingService.getRecordingMetadata(sessionId);
      
      if (!metadata || !metadata.outputPath) {
        return res.status(404).json({
          success: false,
          error: 'Recording not found or not yet completed',
          sessionId,
          requestId
        });
      }

      // Set appropriate headers for download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="recording-${sessionId}.zip"`);
      
      // In a real implementation, you would stream the file here
      // For now, return metadata
      res.json({
        success: true,
        message: 'Download would start here',
        sessionId,
        requestId,
        downloadUrl: `/recordings/${sessionId}/${format}`,
        metadata
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
   * GET /api/v1/sessions/:sessionId/recording/metadata
   * Get recording metadata for a session
   */
  router.get('/:sessionId/metadata', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      const metadata = await recordingService.getRecordingMetadata(sessionId);
      
      if (!metadata) {
        return res.status(404).json({
          success: false,
          error: 'Recording not found',
          sessionId,
          requestId
        });
      }

      res.json({
        success: true,
        sessionId,
        requestId,
        metadata: {
          recordingId: metadata.recordingId,
          sessionId: metadata.sessionId,
          startedAt: metadata.startedAt,
          stoppedAt: metadata.stoppedAt,
          duration: metadata.duration,
          eventCount: metadata.eventCount,
          screenshotCount: metadata.screenshotCount,
          outputPath: metadata.outputPath,
          fileSize: metadata.fileSize
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
   * DELETE /api/v1/sessions/:sessionId/recording
   * Delete recording for a session
   */
  router.delete('/:sessionId', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      // Stop recording if active
      if (recordingService.activeRecordings.has(sessionId)) {
        await recordingService.stopRecording(sessionId);
      }

      // Delete recording files
      const result = await recordingService.deleteRecording(sessionId);
      
      res.json({
        success: true,
        message: 'Recording deleted successfully',
        sessionId,
        requestId,
        deletedFiles: result.deletedFiles || 0
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

