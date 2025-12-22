const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../../middleware/error-handler');
const container = require('../../core/container');
const { validateSessionId } = require('../../utils/validation');

function createRouter() {
  const router = express.Router();
  const sessionStore = container.resolve('sessionStore');
  const eventStore = container.resolve('eventStore');
  const eventBus = container.resolve('eventBus');

  /**
   * GET /api/v1/sessions/:sessionId/snapshot
   * Get snapshot of a session
   */
  router.get('/:sessionId/snapshot', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      const session = await sessionStore.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
          sessionId,
          requestId
        });
      }

      // Create snapshot
      const snapshot = session.createSnapshot ? session.createSnapshot() : {
        sessionId,
        state: session.state,
        steps: session.steps,
        metadata: session.metadata,
        createdAt: new Date()
      };

      res.json({
        success: true,
        sessionId,
        requestId,
        snapshot
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
   * POST /api/v1/sessions/:sessionId/snapshot/restore
   * Restore session from snapshot
   */
  router.post('/:sessionId/snapshot/restore', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { snapshot } = req.body;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      if (!snapshot) {
        return res.status(400).json({
          success: false,
          error: 'Snapshot data is required',
          sessionId,
          requestId
        });
      }

      const session = await sessionStore.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
          sessionId,
          requestId
        });
      }

      // Restore from snapshot
      if (session.restoreFromSnapshot) {
        await session.restoreFromSnapshot(snapshot);
      } else {
        // Manual restore
        Object.assign(session, {
          state: snapshot.state,
          steps: snapshot.steps,
          metadata: snapshot.metadata
        });
      }

      // Emit snapshot restored event
      const { SessionSnapshotRestoredEvent } = require('../../models/events');
      const restoredEvent = new SessionSnapshotRestoredEvent({
        sessionId,
        snapshotId: snapshot.id || 'manual',
        restoredAt: new Date()
      });
      await eventBus.emit(restoredEvent.type, restoredEvent.data);

      res.json({
        success: true,
        message: 'Session restored from snapshot successfully',
        sessionId,
        requestId,
        session: {
          id: session.id,
          state: session.state,
          updatedAt: new Date()
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
   * GET /api/v1/sessions/:sessionId/statistics
   * Get session statistics
   */
  router.get('/:sessionId/statistics', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      const session = await sessionStore.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
          sessionId,
          requestId
        });
      }

      // Get events for this session
      const events = await eventStore.query({ sessionId }, { limit: 10000 });
      
      // Calculate statistics
      const eventsByType = {};
      events.forEach(event => {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      });

      const statistics = {
        sessionId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt || new Date(),
        duration: session.updatedAt ? 
          new Date(session.updatedAt).getTime() - new Date(session.createdAt).getTime() : 
          Date.now() - new Date(session.createdAt).getTime(),
        stepCount: session.steps?.length || 0,
        eventCount: events.length,
        eventsByType,
        state: session.state,
        metadata: session.metadata
      };

      res.json({
        success: true,
        sessionId,
        requestId,
        statistics
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
   * GET /api/v1/sessions
   * List all sessions with Phase 2A metadata
   */
  router.get('/', asyncHandler(async (req, res) => {
    const { 
      limit = 50, 
      offset = 0,
      state,
      type
    } = req.query;
    const requestId = req.headers['x-request-id'] || uuidv4();

    try {
      // Get all sessions
      const allSessions = await sessionStore.getAllSessions();
      
      // Filter sessions
      let sessions = allSessions;
      if (state) {
        sessions = sessions.filter(s => s.state === state);
      }
      if (type) {
        sessions = sessions.filter(s => s.type === type || s.metadata?.type === type);
      }

      // Paginate
      const paginatedSessions = sessions.slice(
        parseInt(offset), 
        parseInt(offset) + parseInt(limit)
      );

      // Enrich with event counts
      const enrichedSessions = await Promise.all(
        paginatedSessions.map(async (session) => {
          try {
            const events = await eventStore.query({ sessionId: session.id }, { limit: 1000 });
            return {
              id: session.id,
              type: session.type || session.metadata?.type || 'unknown',
              state: session.state,
              createdAt: session.createdAt,
              updatedAt: session.updatedAt,
              stepCount: session.steps?.length || 0,
              eventCount: events.length,
              hasRecording: session.metadata?.hasRecording || false,
              isStreaming: session.metadata?.isStreaming || false
            };
          } catch (err) {
            return {
              id: session.id,
              type: session.type || 'unknown',
              state: session.state,
              createdAt: session.createdAt,
              stepCount: session.steps?.length || 0,
              eventCount: 0
            };
          }
        })
      );

      res.json({
        success: true,
        requestId,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: sessions.length,
          hasMore: sessions.length > parseInt(offset) + parseInt(limit)
        },
        filters: {
          state: state || 'all',
          type: type || 'all'
        },
        sessions: enrichedSessions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        requestId
      });
    }
  }));

  return router;
}

module.exports = createRouter;
