const express = require('express');
const { getLogger } = require('../../utils/logger');

const logger = getLogger('routes-v1');

function createV1Router() {
  const router = express.Router();

  logger.info('Initializing v1 routes...');

  // Core routes
  const createGenerateRouter = require('./generate');
  const createExploreRouter = require('./explore');
  const createSaveRouter = require('./save');
  const createValidateRouter = require('./validate');
  const createHealthRouter = require('./health');
  
  // Phase 2A routes
  const createRecordingRouter = require('./recording');
  const createStreamingRouter = require('./streaming');
  const createEventsRouter = require('./events');
  const createSessionsRouter = require('./sessions');

  router.use('/generate', createGenerateRouter());
  router.use('/explore', createExploreRouter());
  router.use('/save', createSaveRouter());
  router.use('/validate', createValidateRouter());
  router.use('/health', createHealthRouter());
  
  // Phase 2A endpoints
  router.use('/sessions/:sessionId/recording', createRecordingRouter());
  router.use('/sessions/:sessionId/stream', createStreamingRouter());
  router.use('/events', createEventsRouter());
  router.use('/sessions', createSessionsRouter());

  router.get('/', (req, res) => {
    res.json({
      version: 'v1',
      phase2a_enabled: true,
      endpoints: {
        // Core endpoints
        generate: 'POST /api/v1/generate',
        generateCommand: 'POST /api/v1/generate/command',
        explore: 'POST /api/v1/explore',
        exploreSessions: 'GET /api/v1/explore/sessions',
        exploreSession: 'GET /api/v1/explore/:sessionId',
        save: 'POST /api/v1/save',
        saveList: 'GET /api/v1/save/list',
        saveGet: 'GET /api/v1/save/:filename',
        validate: 'POST /api/v1/validate',
        validateCommand: 'POST /api/v1/validate/command',
        health: 'GET /api/v1/health',
        healthDetailed: 'GET /api/v1/health/detailed',
        healthServices: 'GET /api/v1/health/services',
        
        // Phase 2A endpoints - Recording
        recordingStart: 'POST /api/v1/sessions/:sessionId/recording/start',
        recordingStop: 'POST /api/v1/sessions/:sessionId/recording/stop',
        recordingStatus: 'GET /api/v1/sessions/:sessionId/recording/status',
        recordingDownload: 'GET /api/v1/sessions/:sessionId/recording/download',
        recordingMetadata: 'GET /api/v1/sessions/:sessionId/recording/metadata',
        recordingDelete: 'DELETE /api/v1/sessions/:sessionId/recording',
        
        // Phase 2A endpoints - Streaming
        streamingStart: 'POST /api/v1/sessions/:sessionId/stream/start',
        streamingStop: 'POST /api/v1/sessions/:sessionId/stream/stop',
        streamingPause: 'POST /api/v1/sessions/:sessionId/stream/pause',
        streamingResume: 'POST /api/v1/sessions/:sessionId/stream/resume',
        streamingStatus: 'GET /api/v1/sessions/:sessionId/stream/status',
        
        // Phase 2A endpoints - Events
        sessionEvents: 'GET /api/v1/events/:sessionId',
        eventsQuery: 'GET /api/v1/events',
        eventTypes: 'GET /api/v1/events/types/list',
        
        // Phase 2A endpoints - Sessions
        sessionSnapshot: 'GET /api/v1/sessions/:sessionId/snapshot',
        sessionSnapshotRestore: 'POST /api/v1/sessions/:sessionId/snapshot/restore',
        sessionStatistics: 'GET /api/v1/sessions/:sessionId/statistics',
        sessionsList: 'GET /api/v1/sessions'
      }
    });
  });

  logger.info('v1 routes initialized ✅');

  return router;
}

module.exports = createV1Router;
