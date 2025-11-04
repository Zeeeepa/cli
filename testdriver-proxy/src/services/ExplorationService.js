const { getLogger } = require('../utils/logger');
const logger = getLogger('exploration-service');

class ExplorationService {
  constructor(yamlGenerator, sessionStore) {
    this.yamlGenerator = yamlGenerator;
    this.sessionStore = sessionStore;
  }

  async executeStep(params) {
    const { prompt, sessionId, screenshot = null } = params;
    logger.info('Executing exploration step:', { prompt, sessionId });

    let session = sessionId ? this.sessionStore.get(sessionId) : null;
    
    if (!session) {
      session = this.sessionStore.create({ mode: 'exploration' });
      logger.info('Created new exploration session:', session.id);
    }

    try {
      const previousCommands = session.steps.flatMap(s => s.commands || []);
      const result = await this.yamlGenerator.generateCommand(prompt, { screenshot, previousCommands });

      const step = { prompt, commands: [result.command], timestamp: new Date() };
      this.sessionStore.addStep(session.id, step);

      logger.info('Exploration step executed');
      return { success: true, sessionId: session.id, step, totalSteps: session.steps.length };
    } catch (error) {
      logger.error('Exploration step failed:', error);
      throw error;
    }
  }

  getSession(sessionId) {
    logger.info('Retrieving session:', sessionId);
    const session = this.sessionStore.get(sessionId);

    if (!session) {
      const error = new Error('Session not found');
      error.statusCode = 404;
      throw error;
    }

    return { success: true, session };
  }

  deleteSession(sessionId) {
    logger.info('Deleting session:', sessionId);
    const deleted = this.sessionStore.delete(sessionId);
    return { success: deleted, message: deleted ? 'Session deleted' : 'Session not found' };
  }

  listSessions() {
    const sessions = this.sessionStore.getAll();
    return { success: true, sessions, count: sessions.length };
  }
}

module.exports = ExplorationService;
