const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const config = require('../config');
const { getLogger } = require('../utils/logger');
const logger = getLogger('persistence-service');

class PersistenceService {
  constructor(sessionStore) {
    this.sessionStore = sessionStore;
    this.testDir = config.storage.testDir;
  }

  async saveSession(params) {
    const { sessionId, sessionData, filename } = params;
    logger.info('Saving session:', { sessionId, filename });

    let steps;

    if (sessionId) {
      const session = this.sessionStore.get(sessionId);
      if (!session) {
        const error = new Error('Session not found');
        error.statusCode = 404;
        throw error;
      }
      steps = session.steps;
    } else if (sessionData) {
      steps = Array.isArray(sessionData) ? sessionData : sessionData.steps;
    } else {
      const error = new Error('Either sessionId or session data is required');
      error.statusCode = 400;
      throw error;
    }

    const yamlContent = yaml.dump({
      version: config.testdriver.version,
      session: sessionId || 'default',
      steps
    });

    await fs.mkdir(this.testDir, { recursive: true });

    const fileName = filename || `test-${Date.now()}.yaml`;
    const filePath = path.join(this.testDir, fileName);

    await fs.writeFile(filePath, yamlContent, 'utf8');

    logger.info('Session saved:', { filePath, steps: steps.length });
    return { success: true, filename: fileName, path: filePath, yaml: yamlContent, stepsCount: steps.length };
  }

  async listFiles() {
    logger.info('Listing saved test files');

    try {
      const files = await fs.readdir(this.testDir);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      const fileDetails = await Promise.all(
        yamlFiles.map(async (file) => {
          const filePath = path.join(this.testDir, file);
          const stats = await fs.stat(filePath);
          return { name: file, path: filePath, size: stats.size, modified: stats.mtime };
        })
      );

      logger.info(`Found ${fileDetails.length} test files`);
      return { success: true, files: fileDetails, count: fileDetails.length };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, files: [], count: 0 };
      }
      throw error;
    }
  }

  async loadFile(filename) {
    logger.info('Loading test file:', filename);
    const filePath = path.join(this.testDir, filename);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = yaml.load(content);

      logger.info('Test file loaded:', { filename, steps: parsed.steps?.length || 0 });
      return { success: true, filename, yaml: content, parsed };
    } catch (error) {
      if (error.code === 'ENOENT') {
        const notFoundError = new Error('File not found');
        notFoundError.statusCode = 404;
        throw notFoundError;
      }
      throw error;
    }
  }

  async deleteFile(filename) {
    logger.info('Deleting test file:', filename);
    const filePath = path.join(this.testDir, filename);

    try {
      await fs.unlink(filePath);
      logger.info('Test file deleted:', filename);
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      if (error.code === 'ENOENT') {
        const notFoundError = new Error('File not found');
        notFoundError.statusCode = 404;
        throw notFoundError;
      }
      throw error;
    }
  }
}

module.exports = PersistenceService;
