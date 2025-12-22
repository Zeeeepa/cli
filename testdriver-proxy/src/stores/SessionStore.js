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
      steps: [],
      metadata,
      created: new Date(),
      updated: new Date()
    };

    // Enforce max sessions limit (FIFO)
    if (this.sessions.size >= this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      this.sessions.delete(oldestKey);
      logger.warn(`Max sessions reached. Deleted oldest session: ${oldestKey}`);
    }

    this.sessions.set(sessionId, session);
    logger.info(`Created session: ${sessionId}`);

    return session;
  }

  get(sessionId) {
    return this.sessions.get(sessionId) || null;
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
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old sessions`);
    }

    return cleaned;
  }
}

module.exports = SessionStore;
