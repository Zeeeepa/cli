/**
 * WebSocket Service
 * 
 * Manages WebSocket connections for real-time features:
 * - Live test execution streaming
 * - Multi-client observation
 * - Browser extension communication
 * - Dashcam recording coordination
 */

const { Server } = require('socket.io');
const { EventTypes } = require('../models/events');
const logger = require('../utils/logger');

class WebSocketService {
  constructor(httpServer, eventBus, config = {}) {
    this.httpServer = httpServer;
    this.eventBus = eventBus;
    this.config = {
      cors: config.cors || {
        origin: "*",
        methods: ["GET", "POST"]
      },
      pingTimeout: config.pingTimeout || 60000,
      pingInterval: config.pingInterval || 25000,
      ...config
    };

    this.io = null;
    this.connections = new Map(); // clientId -> connection info
    this.sessionRooms = new Map(); // sessionId -> Set of clientIds
    this.initialized = false;
  }

  /**
   * Initialize WebSocket server
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Create Socket.IO server
      this.io = new Server(this.httpServer, {
        cors: this.config.cors,
        pingTimeout: this.config.pingTimeout,
        pingInterval: this.config.pingInterval,
        transports: ['websocket', 'polling']
      });

      // Set up connection handler
      this.io.on('connection', (socket) => this.handleConnection(socket));

      // Subscribe to event bus
      this.setupEventBusSubscriptions();

      this.initialized = true;
      logger.info('WebSocketService initialized', {
        cors: this.config.cors.origin,
        pingTimeout: this.config.pingTimeout
      });
    } catch (error) {
      logger.error('Failed to initialize WebSocketService', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   * 
   * @param {Socket} socket - Socket.IO socket
   * @private
   */
  handleConnection(socket) {
    const clientId = socket.id;
    
    logger.info('Client connected', {
      clientId,
      remoteAddress: socket.handshake.address
    });

    // Store connection info
    this.connections.set(clientId, {
      socket,
      clientType: null, // viewer, dashcam, extension, controller
      sessionId: null,
      connectedAt: Date.now(),
      userAgent: socket.handshake.headers['user-agent']
    });

    // Set up event handlers
    this.setupSocketHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(clientId, reason);
    });
  }

  /**
   * Setup event handlers for a socket
   * 
   * @param {Socket} socket - Socket.IO socket
   * @private
   */
  setupSocketHandlers(socket) {
    const clientId = socket.id;

    // Join session room
    socket.on('join-session', async (data) => {
      try {
        const { sessionId, clientType = 'viewer', token } = data;

        // TODO: Validate token if authentication is enabled
        
        // Join room
        socket.join(`session:${sessionId}`);

        // Update connection info
        const conn = this.connections.get(clientId);
        if (conn) {
          conn.sessionId = sessionId;
          conn.clientType = clientType;
        }

        // Track in session rooms
        if (!this.sessionRooms.has(sessionId)) {
          this.sessionRooms.set(sessionId, new Set());
        }
        this.sessionRooms.get(sessionId).add(clientId);

        // Emit connection event to event bus
        await this.eventBus.publish(EventTypes.CLIENT_CONNECTED, {
          clientId,
          sessionId,
          clientType,
          userAgent: socket.handshake.headers['user-agent']
        }, { sessionId });

        // Send confirmation
        socket.emit('session-joined', {
          sessionId,
          clientType,
          timestamp: Date.now()
        });

        logger.info('Client joined session', {
          clientId,
          sessionId,
          clientType
        });
      } catch (error) {
        logger.error('Error joining session', {
          clientId,
          error: error.message
        });
        socket.emit('error', {
          message: 'Failed to join session',
          error: error.message
        });
      }
    });

    // Leave session room
    socket.on('leave-session', async (data) => {
      try {
        const { sessionId } = data;
        socket.leave(`session:${sessionId}`);

        // Remove from session rooms
        if (this.sessionRooms.has(sessionId)) {
          this.sessionRooms.get(sessionId).delete(clientId);
        }

        // Update connection info
        const conn = this.connections.get(clientId);
        if (conn) {
          conn.sessionId = null;
        }

        socket.emit('session-left', { sessionId });

        logger.info('Client left session', { clientId, sessionId });
      } catch (error) {
        logger.error('Error leaving session', {
          clientId,
          error: error.message
        });
      }
    });

    // Handle streaming control commands
    socket.on('streaming-control', async (data) => {
      try {
        const { sessionId, action } = data; // action: pause, resume, speed
        
        // Broadcast control to all clients in session
        this.broadcastToSession(sessionId, 'streaming-control', {
          action,
          timestamp: Date.now()
        });

        logger.info('Streaming control', {
          clientId,
          sessionId,
          action
        });
      } catch (error) {
        logger.error('Error handling streaming control', {
          clientId,
          error: error.message
        });
      }
    });

    // Handle ping/pong for connection keep-alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  }

  /**
   * Handle client disconnection
   * 
   * @param {string} clientId - Client ID
   * @param {string} reason - Disconnect reason
   * @private
   */
  async handleDisconnection(clientId, reason) {
    const conn = this.connections.get(clientId);
    
    if (conn) {
      logger.info('Client disconnected', {
        clientId,
        reason,
        sessionId: conn.sessionId,
        clientType: conn.clientType
      });

      // Remove from session rooms
      if (conn.sessionId && this.sessionRooms.has(conn.sessionId)) {
        this.sessionRooms.get(conn.sessionId).delete(clientId);
      }

      // Emit disconnection event
      if (conn.sessionId) {
        await this.eventBus.publish(EventTypes.CLIENT_DISCONNECTED, {
          clientId,
          sessionId: conn.sessionId,
          clientType: conn.clientType,
          reason
        }, { sessionId: conn.sessionId });
      }

      // Remove connection
      this.connections.delete(clientId);
    }
  }

  /**
   * Setup event bus subscriptions
   * 
   * Listens to events and broadcasts them to appropriate WebSocket clients
   * 
   * @private
   */
  setupEventBusSubscriptions() {
    // Subscribe to all session events
    this.eventBus.subscribe('session:**', (event) => {
      if (event.metadata?.sessionId) {
        this.broadcastToSession(event.metadata.sessionId, 'session-event', event);
      }
    });

    // Subscribe to step execution events
    this.eventBus.subscribe('step:**', (event) => {
      if (event.metadata?.sessionId) {
        this.broadcastToSession(event.metadata.sessionId, 'step-event', event);
      }
    });

    // Subscribe to recording events (screenshots, DOM, network logs)
    this.eventBus.subscribe('recording:**', (event) => {
      if (event.metadata?.sessionId) {
        this.broadcastToSession(event.metadata.sessionId, 'recording-event', event);
      }
    });

    // Subscribe to self-healing events
    this.eventBus.subscribe('healing:**', (event) => {
      if (event.metadata?.sessionId) {
        this.broadcastToSession(event.metadata.sessionId, 'healing-event', event);
      }
    });

    // Subscribe to browser extension events
    this.eventBus.subscribe('browser:**', (event) => {
      if (event.metadata?.sessionId) {
        this.broadcastToSession(event.metadata.sessionId, 'browser-event', event);
      }
    });

    logger.info('WebSocketService subscribed to event bus');
  }

  /**
   * Broadcast message to all clients in a session
   * 
   * @param {string} sessionId - Session ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  broadcastToSession(sessionId, event, data) {
    if (!this.io) {
      return;
    }

    this.io.to(`session:${sessionId}`).emit(event, data);
    
    logger.debug('Broadcast to session', {
      sessionId,
      event,
      clientCount: this.getSessionClientCount(sessionId)
    });
  }

  /**
   * Broadcast message to specific client types in a session
   * 
   * @param {string} sessionId - Session ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {string|Array} clientTypes - Client type(s) to broadcast to
   */
  broadcastToSessionByType(sessionId, event, data, clientTypes) {
    if (!this.io) {
      return;
    }

    const types = Array.isArray(clientTypes) ? clientTypes : [clientTypes];
    const room = this.sessionRooms.get(sessionId);

    if (room) {
      for (const clientId of room) {
        const conn = this.connections.get(clientId);
        if (conn && types.includes(conn.clientType)) {
          conn.socket.emit(event, data);
        }
      }
    }

    logger.debug('Broadcast to session by type', {
      sessionId,
      event,
      clientTypes: types
    });
  }

  /**
   * Send message to specific client
   * 
   * @param {string} clientId - Client ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  sendToClient(clientId, event, data) {
    const conn = this.connections.get(clientId);
    
    if (conn) {
      conn.socket.emit(event, data);
    }
  }

  /**
   * Get active viewers for a session
   * 
   * @param {string} sessionId - Session ID
   * @returns {Array} List of viewer info
   */
  getActiveViewers(sessionId) {
    const viewers = [];
    const room = this.sessionRooms.get(sessionId);

    if (room) {
      for (const clientId of room) {
        const conn = this.connections.get(clientId);
        if (conn) {
          viewers.push({
            clientId,
            clientType: conn.clientType,
            connectedAt: conn.connectedAt,
            userAgent: conn.userAgent
          });
        }
      }
    }

    return viewers;
  }

  /**
   * Get number of clients in a session
   * 
   * @param {string} sessionId - Session ID
   * @returns {number} Client count
   */
  getSessionClientCount(sessionId) {
    const room = this.sessionRooms.get(sessionId);
    return room ? room.size : 0;
  }

  /**
   * Get connection statistics
   * 
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      activeSessions: this.sessionRooms.size,
      connectionsByType: this.getConnectionsByType()
    };
  }

  /**
   * Get connections grouped by client type
   * 
   * @returns {Object} Connections by type
   * @private
   */
  getConnectionsByType() {
    const byType = {};

    for (const conn of this.connections.values()) {
      const type = conn.clientType || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    }

    return byType;
  }

  /**
   * Shutdown WebSocket service
   */
  async shutdown() {
    logger.info('Shutting down WebSocketService');

    if (this.io) {
      // Disconnect all clients
      this.io.disconnectSockets();
      
      // Close server
      await new Promise((resolve) => {
        this.io.close(resolve);
      });
    }

    this.connections.clear();
    this.sessionRooms.clear();
    this.initialized = false;

    logger.info('WebSocketService shutdown complete');
  }
}

module.exports = WebSocketService;

