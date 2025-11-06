/**
 * Session Store
 * Centralized session management for exploratory testing
 */

const { v4: uuidv4 } = require('uuid');
const { getLogger } = require('../utils/logger');

const logger = getLogger('session-store');

class SessionStore {
  constructor() {
    this.sessions = new Map();
    this.snapshots = new Map(); // sessionId -> array of snapshots
    this.maxSessions = 1000; // Prevent memory leaks
  }

  /**
   * Create a new session
   * @param {Object} metadata - Initial session metadata
   * @returns {Object} Session object with ID
   */
  create(metadata = {}) {
    const sessionId = uuidv4();
    
    const session = {
      id: sessionId,
      status: 'active', // active, paused, completed, failed
      steps: [],
      metadata: {
        ...metadata,
        recording: {
          enabled: false,
          recordingId: null
        },
        streaming: {
          enabled: false,
          viewerCount: 0
        }
      },
      state: {
        variables: {},
        currentStep: 0,
        testsPassed: 0,
        testsFailed: 0
      },
      created: new Date(),
      updated: new Date()
    };

    // Enforce max sessions limit (FIFO)
    if (this.sessions.size >= this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      this.sessions.delete(oldestKey);
      this.snapshots.delete(oldestKey);
      logger.warn(`Max sessions reached. Deleted oldest session: ${oldestKey}`);
    }

    this.sessions.set(sessionId, session);
    this.snapshots.set(sessionId, []);
    logger.info(`Created session: ${sessionId}`);

    return session;
  }

  get(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  // Alias for get() for consistency with route expectations
  getSession(sessionId) {
    return this.get(sessionId);
  }

  update(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    Object.assign(session, updates, { updated: new Date() });
    logger.info(`Updated session: ${sessionId}`);

    return session;
  }

  addStep(sessionId, step) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    session.steps.push(step);
    session.updated = new Date();
    
    logger.info(`Added step to session ${sessionId}. Total steps: ${session.steps.length}`);

    return session;
  }

  delete(sessionId) {
    const deleted = this.sessions.delete(sessionId);
    
    if (deleted) {
      logger.info(`Deleted session: ${sessionId}`);
    }

    return deleted;
  }

  getAll() {
    return Array.from(this.sessions.values());
  }

  // Alias for getAll() for consistency with route expectations
  getAllSessions() {
    return this.getAll();
  }

  count() {
    return this.sessions.size;
  }

  clear() {
    const count = this.sessions.size;
    this.sessions.clear();
    logger.info(`Cleared ${count} sessions`);
  }

  cleanup(maxAge = 24 * 60 * 60 * 1000) {
    const now = new Date();
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (now - session.updated > maxAge) {
        this.sessions.delete(id);
        this.snapshots.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old sessions`);
    }

    return cleaned;
  }

  // ===== Advanced Session Management Methods =====

  /**
   * Create a state snapshot
   * @param {string} sessionId - Session ID
   * @param {string} label - Snapshot label
   * @returns {Object} Snapshot object
   */
  createSnapshot(sessionId, label = '') {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    const snapshot = {
      id: `snap_${Date.now()}`,
      label,
      timestamp: new Date(),
      stepIndex: session.steps.length,
      state: JSON.parse(JSON.stringify(session.state)), // Deep copy
      stepsSnapshot: JSON.parse(JSON.stringify(session.steps))
    };

    const snapshots = this.snapshots.get(sessionId);
    snapshots.push(snapshot);

    logger.info(`Created snapshot for session ${sessionId}:`, { 
      snapshotId: snapshot.id, 
      label 
    });

    return snapshot;
  }

  /**
   * Restore session to a snapshot
   * @param {string} sessionId - Session ID
   * @param {string} snapshotId - Snapshot ID
   * @returns {Object} Restored session
   */
  restoreSnapshot(sessionId, snapshotId) {
    const session = this.sessions.get(sessionId);
    const snapshots = this.snapshots.get(sessionId);
    
    if (!session || !snapshots) {
      return null;
    }

    const snapshot = snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      logger.warn(`Snapshot not found: ${snapshotId}`);
      return null;
    }

    // Restore state and steps
    session.state = JSON.parse(JSON.stringify(snapshot.state));
    session.steps = JSON.parse(JSON.stringify(snapshot.stepsSnapshot));
    session.updated = new Date();

    logger.info(`Restored session ${sessionId} to snapshot ${snapshotId}`);

    return session;
  }

  /**
   * Get all snapshots for a session
   * @param {string} sessionId - Session ID
   * @returns {Array} Array of snapshots
   */
  getSnapshots(sessionId) {
    return this.snapshots.get(sessionId) || [];
  }

  /**
   * Update session status
   * @param {string} sessionId - Session ID
   * @param {string} status - New status (active, paused, completed, failed)
   * @returns {Object} Updated session
   */
  updateStatus(sessionId, status) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    session.status = status;
    session.updated = new Date();

    logger.info(`Session ${sessionId} status updated to: ${status}`);

    return session;
  }

  /**
   * Update session recording info
   * @param {string} sessionId - Session ID
   * @param {Object} recordingInfo - Recording information
   * @returns {Object} Updated session
   */
  updateRecording(sessionId, recordingInfo) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    session.metadata.recording = {
      ...session.metadata.recording,
      ...recordingInfo
    };
    session.updated = new Date();

    return session;
  }

  /**
   * Update session streaming info
   * @param {string} sessionId - Session ID
   * @param {Object} streamingInfo - Streaming information
   * @returns {Object} Updated session
   */
  updateStreaming(sessionId, streamingInfo) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    session.metadata.streaming = {
      ...session.metadata.streaming,
      ...streamingInfo
    };
    session.updated = new Date();

    return session;
  }

  /**
   * Get sessions by status
   * @param {string} status - Status filter
   * @returns {Array} Filtered sessions
   */
  getByStatus(status) {
    return Array.from(this.sessions.values()).filter(
      session => session.status === status
    );
  }

  /**
   * Get active sessions
   * @returns {Array} Active sessions
   */
  getActiveSessions() {
    return this.getByStatus('active');
  }
}

module.exports = SessionStore;
