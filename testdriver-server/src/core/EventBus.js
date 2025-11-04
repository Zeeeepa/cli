/**
 * Event Bus System for TestDriver Server
 * 
 * Central event hub that enables:
 * - Event-driven architecture across all services
 * - Real-time event streaming
 * - Event persistence for replay
 * - Wildcard event subscriptions
 * - Event sourcing capabilities
 */

const EventEmitter2 = require('eventemitter2');
const { validateEvent, EventTypes } = require('../models/events');
const logger = require('../utils/logger');

class EventBus extends EventEmitter2 {
  constructor(config = {}) {
    // Initialize EventEmitter2 with advanced features
    super({
      wildcard: true,              // Enable wildcard event subscriptions (e.g., 'session:*')
      delimiter: ':',              // Use ':' as delimiter for namespaced events
      newListener: false,          // Disable newListener events
      maxListeners: 50,            // Allow many listeners (streaming, recording, etc.)
      verboseMemoryLeak: true,     // Warn about memory leaks
      ignoreErrors: false          // Don't ignore errors in event handlers
    });

    this.config = config;
    this.eventLog = [];            // In-memory event log (recent events)
    this.maxLogSize = config.maxLogSize || 1000;  // Keep last 1000 events
    this.persistence = config.persistence || null; // Event persistence handler
    this.metrics = {
      eventsPublished: 0,
      eventsProcessed: 0,
      errors: 0
    };

    // Bind methods
    this.publish = this.publish.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);

    logger.info('EventBus initialized', {
      wildcard: true,
      maxListeners: 50,
      persistence: !!this.persistence
    });
  }

  /**
   * Publish an event to the bus
   * 
   * @param {string|Object} typeOrEvent - Event type string or Event object
   * @param {Object} data - Event data (if typeOrEvent is string)
   * @param {Object} metadata - Event metadata (if typeOrEvent is string)
   * @returns {Promise<Object>} Published event
   */
  async publish(typeOrEvent, data = {}, metadata = {}) {
    try {
      // Handle both string type and Event object
      let event;
      if (typeof typeOrEvent === 'string') {
        // Create event from type string
        event = {
          id: this.generateEventId(),
          type: typeOrEvent,
          timestamp: Date.now(),
          data,
          metadata: {
            ...metadata,
            publishedAt: new Date().toISOString()
          }
        };
      } else if (typeof typeOrEvent === 'object') {
        // Use provided event object
        event = typeOrEvent;
        if (!event.id) {
          event.id = this.generateEventId();
        }
        if (!event.timestamp) {
          event.timestamp = Date.now();
        }
      } else {
        throw new Error('Invalid event type');
      }

      // Validate event structure
      validateEvent(event);

      // Add to in-memory log
      this.addToLog(event);

      // Persist event if persistence is configured
      if (this.persistence) {
        await this.persistence.store(event);
      }

      // Emit the event
      this.emit(event.type, event);

      // Update metrics
      this.metrics.eventsPublished++;

      logger.debug(`Event published: ${event.type}`, {
        eventId: event.id,
        sessionId: event.metadata?.sessionId
      });

      return event;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Error publishing event', {
        error: error.message,
        type: typeOrEvent,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Subscribe to events
   * 
   * @param {string} eventType - Event type to subscribe to (supports wildcards)
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function');
    }

    // Wrap handler to count processed events
    const wrappedHandler = (event) => {
      try {
        this.metrics.eventsProcessed++;
        handler(event);
      } catch (error) {
        this.metrics.errors++;
        logger.error('Error in event handler', {
          eventType,
          error: error.message,
          stack: error.stack
        });
      }
    };

    this.on(eventType, wrappedHandler);

    logger.debug(`Subscriber added for: ${eventType}`);

    // Return unsubscribe function
    return () => this.unsubscribe(eventType, wrappedHandler);
  }

  /**
   * Unsubscribe from events
   * 
   * @param {string} eventType - Event type to unsubscribe from
   * @param {Function} handler - Event handler to remove
   */
  unsubscribe(eventType, handler) {
    this.off(eventType, handler);
    logger.debug(`Subscriber removed for: ${eventType}`);
  }

  /**
   * Subscribe to all events (wildcard)
   * 
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  subscribeAll(handler) {
    return this.subscribe('**', handler);
  }

  /**
   * Subscribe to events for a specific session
   * 
   * @param {string} sessionId - Session ID
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  subscribeToSession(sessionId, handler) {
    // Filter events by sessionId
    const sessionHandler = (event) => {
      if (event.metadata?.sessionId === sessionId) {
        handler(event);
      }
    };

    return this.subscribe('**', sessionHandler);
  }

  /**
   * Get recent events
   * 
   * @param {Object} filters - Filter options
   * @returns {Array} Filtered events
   */
  getRecentEvents(filters = {}) {
    let events = [...this.eventLog];

    // Filter by session ID
    if (filters.sessionId) {
      events = events.filter(e => e.metadata?.sessionId === filters.sessionId);
    }

    // Filter by event type
    if (filters.type) {
      events = events.filter(e => e.type === filters.type);
    }

    // Filter by type pattern (wildcard)
    if (filters.typePattern) {
      const pattern = new RegExp(filters.typePattern.replace('*', '.*'));
      events = events.filter(e => pattern.test(e.type));
    }

    // Filter by time range
    if (filters.since) {
      events = events.filter(e => e.timestamp >= filters.since);
    }

    if (filters.until) {
      events = events.filter(e => e.timestamp <= filters.until);
    }

    // Limit results
    if (filters.limit) {
      events = events.slice(-filters.limit);
    }

    return events;
  }

  /**
   * Get events for a specific session
   * 
   * @param {string} sessionId - Session ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Session events
   */
  async getSessionEvents(sessionId, options = {}) {
    // Try persistence first if available
    if (this.persistence) {
      try {
        return await this.persistence.getBySession(sessionId, options);
      } catch (error) {
        logger.warn('Error retrieving session events from persistence', {
          error: error.message,
          sessionId
        });
      }
    }

    // Fall back to in-memory log
    return this.getRecentEvents({ sessionId, ...options });
  }

  /**
   * Replay events
   * 
   * Useful for reconstructing session state or debugging
   * 
   * @param {Array} events - Events to replay
   * @param {Function} handler - Handler for each event
   * @param {Object} options - Replay options
   */
  async replay(events, handler, options = {}) {
    const delay = options.delay || 0;
    const speed = options.speed || 1;

    for (const event of events) {
      // Call handler
      if (handler) {
        await handler(event);
      }

      // Re-emit event if requested
      if (options.reemit) {
        this.emit(event.type, event);
      }

      // Delay between events if specified
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay / speed));
      }
    }

    logger.info(`Replayed ${events.length} events`, {
      speed,
      delay,
      reemit: options.reemit
    });
  }

  /**
   * Add event to in-memory log
   * 
   * @param {Object} event - Event to add
   * @private
   */
  addToLog(event) {
    this.eventLog.push(event);

    // Trim log if it exceeds max size
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }
  }

  /**
   * Generate unique event ID
   * 
   * @returns {string} Event ID
   * @private
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event bus metrics
   * 
   * @returns {Object} Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      logSize: this.eventLog.length,
      listenerCount: this.listenerCount('**'),
      uptime: process.uptime()
    };
  }

  /**
   * Clear event log (for testing or memory management)
   */
  clearLog() {
    this.eventLog = [];
    logger.info('Event log cleared');
  }

  /**
   * Shutdown event bus
   */
  async shutdown() {
    logger.info('Shutting down EventBus');
    
    // Persist remaining events if persistence is configured
    if (this.persistence && this.eventLog.length > 0) {
      try {
        await this.persistence.flush(this.eventLog);
      } catch (error) {
        logger.error('Error flushing events on shutdown', { error: error.message });
      }
    }

    // Remove all listeners
    this.removeAllListeners();
    
    logger.info('EventBus shutdown complete', {
      metrics: this.getMetrics()
    });
  }
}

module.exports = EventBus;

