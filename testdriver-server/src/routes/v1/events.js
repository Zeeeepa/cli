const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../../middleware/error-handler');
const container = require('../../core/container');
const { 
  validateSessionId, 
  validateEventQuery 
} = require('../../utils/validation');

function createRouter() {
  const router = express.Router();
  const eventStore = container.resolve('eventStore');
  const eventBus = container.resolve('eventBus');

  /**
   * GET /api/v1/sessions/:sessionId/events
   * Query events for a specific session
   */
  router.get('/:sessionId', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Validate input
    validateSessionId(sessionId);
    validateEventQuery(req.query);

    const { 
      type, 
      since, 
      until, 
      limit = 100, 
      offset = 0,
      orderBy = 'desc'
    } = req.query;

    const filters = {
      sessionId,
      ...(type && { type }),
      ...(since && { since: new Date(since) }),
      ...(until && { until: new Date(until) })
    };

    const events = await eventStore.query(filters, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy
    });
    
    res.json({
      success: true,
      sessionId,
      requestId,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: events.length,
        hasMore: events.length === parseInt(limit)
      },
      events: events.map(event => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        data: event.data,
        sessionId: event.sessionId || event.data?.sessionId
      }))
    });
  }));

  /**
   * GET /api/v1/events
   * Query events with filters (global query)
   */
  router.get('/', asyncHandler(async (req, res) => {
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Validate query parameters
    validateEventQuery(req.query);

    const { 
      type, 
      sessionId,
      since, 
      until, 
      limit = 100, 
      offset = 0,
      orderBy = 'desc'
    } = req.query;

    // Validate sessionId if provided
    if (sessionId) {
      validateSessionId(sessionId);
    }

    const filters = {
      ...(sessionId && { sessionId }),
      ...(type && { type }),
      ...(since && { since: new Date(since) }),
      ...(until && { until: new Date(until) })
    };

    const events = await eventStore.query(filters, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy
    });
    
    res.json({
      success: true,
      requestId,
      filters: {
        type: type || 'all',
        sessionId: sessionId || 'all',
        since: since || 'beginning',
        until: until || 'now'
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: events.length,
        hasMore: events.length === parseInt(limit)
      },
      events: events.map(event => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        data: event.data,
        sessionId: event.sessionId || event.data?.sessionId
      }))
    });
  }));

  /**
   * GET /api/v1/events/types
   * Get list of all event types
   */
  router.get('/types/list', asyncHandler(async (req, res) => {
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Get all event types from the events model
    const eventTypes = [
        // Test Generation Events
        { type: 'test.generation.started', category: 'generation', description: 'Test generation started' },
        { type: 'test.generation.completed', category: 'generation', description: 'Test generation completed successfully' },
        { type: 'test.generation.failed', category: 'generation', description: 'Test generation failed' },
        { type: 'command.generation.started', category: 'generation', description: 'Command generation started' },
        { type: 'command.generation.completed', category: 'generation', description: 'Command generation completed' },
        { type: 'command.generation.failed', category: 'generation', description: 'Command generation failed' },
        
        // Exploration Events
        { type: 'exploration.started', category: 'exploration', description: 'Exploration session started' },
        { type: 'exploration.step.completed', category: 'exploration', description: 'Exploration step completed' },
        { type: 'exploration.step.failed', category: 'exploration', description: 'Exploration step failed' },
        
        // Session Events
        { type: 'session.created', category: 'session', description: 'Session created' },
        { type: 'session.deleted', category: 'session', description: 'Session deleted' },
        { type: 'session.snapshot.created', category: 'session', description: 'Session snapshot created' },
        { type: 'session.snapshot.restored', category: 'session', description: 'Session restored from snapshot' },
        
        // Persistence Events
        { type: 'test.saved', category: 'persistence', description: 'Test saved to file' },
        { type: 'test.loaded', category: 'persistence', description: 'Test loaded from file' },
        { type: 'test.deleted', category: 'persistence', description: 'Test deleted' },
        
        // Validation Events
        { type: 'validation.started', category: 'validation', description: 'Validation started' },
        { type: 'validation.completed', category: 'validation', description: 'Validation completed' },
        { type: 'validation.failed', category: 'validation', description: 'Validation failed' },
        
        // Recording Events
        { type: 'recording.started', category: 'recording', description: 'Recording started' },
        { type: 'recording.stopped', category: 'recording', description: 'Recording stopped' },
        { type: 'recording.screenshot.captured', category: 'recording', description: 'Screenshot captured' },
        { type: 'recording.dom.captured', category: 'recording', description: 'DOM snapshot captured' },
        { type: 'recording.log.captured', category: 'recording', description: 'Log entry captured' },
        
        // Streaming Events
        { type: 'streaming.started', category: 'streaming', description: 'Streaming started' },
        { type: 'streaming.stopped', category: 'streaming', description: 'Streaming stopped' },
        { type: 'streaming.client.connected', category: 'streaming', description: 'Client connected to stream' },
        { type: 'streaming.client.disconnected', category: 'streaming', description: 'Client disconnected from stream' },
        
      // Error Events
      { type: 'error.occurred', category: 'error', description: 'An error occurred' }
    ];

    // Get statistics from EventStore if available
    let statistics = null;
    try {
      const allEvents = await eventStore.query({}, { limit: 10000 });
      const typeCounts = {};
      allEvents.forEach(event => {
        typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
      });
      statistics = { totalEvents: allEvents.length, typeCounts };
    } catch (err) {
      // Statistics optional
    }

    res.json({
      success: true,
      requestId,
      count: eventTypes.length,
      categories: ['generation', 'exploration', 'session', 'persistence', 'validation', 'recording', 'streaming', 'error'],
      eventTypes,
      statistics
    });
  }));

  return router;
}

module.exports = createRouter;
