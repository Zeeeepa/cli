/**
 * Recording Service
 * 
 * Manages session recording for dashcam-style playback:
 * - Screenshot capture and storage
 * - DOM snapshot recording
 * - Network/console log capture
 * - Recording metadata generation
 * - Replay URL generation
 */

const fs = require('fs').promises;
const path = require('path');
const { EventTypes } = require('../models/events');
const logger = require('../utils/logger');

class RecordingService {
  constructor(eventBus, config = {}) {
    this.eventBus = eventBus;
    this.config = {
      storageDir: config.storageDir || path.join(process.cwd(), 'data', 'recordings'),
      screenshotFormat: config.screenshotFormat || 'png',
      autoStart: config.autoStart !== false,
      captureScreenshots: config.captureScreenshots !== false,
      captureDOMSnapshots: config.captureDOMSnapshots !== false,
      captureNetworkLogs: config.captureNetworkLogs !== false,
      captureConsoleLogs: config.captureConsoleLogs !== false,
      ...config
    };

    this.activeRecordings = new Map(); // sessionId -> recording state
    this.initialized = false;
  }

  /**
   * Initialize recording service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Create storage directory
      await fs.mkdir(this.config.storageDir, { recursive: true });

      // Setup event subscriptions
      this.setupEventSubscriptions();

      this.initialized = true;
      logger.info('RecordingService initialized', {
        storageDir: this.config.storageDir,
        autoStart: this.config.autoStart
      });
    } catch (error) {
      logger.error('Failed to initialize RecordingService', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Setup event subscriptions
   * 
   * @private
   */
  setupEventSubscriptions() {
    // Subscribe to session lifecycle
    this.eventBus.subscribe(EventTypes.SESSION_STARTED, (event) => {
      if (this.config.autoStart) {
        this.startRecording(event.metadata.sessionId);
      }
    });

    this.eventBus.subscribe(EventTypes.SESSION_ENDED, (event) => {
      this.stopRecording(event.metadata.sessionId);
    });

    // Subscribe to recordable events
    if (this.config.captureScreenshots) {
      this.eventBus.subscribe(EventTypes.STEP_EXECUTED, (event) => {
        this.handleStepExecuted(event);
      });
    }

    if (this.config.captureConsoleLogs) {
      this.eventBus.subscribe(EventTypes.CONSOLE_LOG_CAPTURED, (event) => {
        this.handleConsoleLog(event);
      });
    }

    if (this.config.captureNetworkLogs) {
      this.eventBus.subscribe(EventTypes.NETWORK_LOG_CAPTURED, (event) => {
        this.handleNetworkLog(event);
      });
    }

    logger.info('RecordingService subscribed to events');
  }

  /**
   * Start recording for a session
   * 
   * @param {string} sessionId - Session ID
   * @param {Object} options - Recording options
   */
  async startRecording(sessionId, options = {}) {
    if (this.activeRecordings.has(sessionId)) {
      logger.warn('Recording already active for session', { sessionId });
      return;
    }

    const recordingId = `rec_${sessionId}_${Date.now()}`;
    const recordingDir = path.join(this.config.storageDir, recordingId);

    // Create recording directory
    await fs.mkdir(recordingDir, { recursive: true });
    await fs.mkdir(path.join(recordingDir, 'screenshots'), { recursive: true });
    await fs.mkdir(path.join(recordingDir, 'dom-snapshots'), { recursive: true });

    const recordingState = {
      recordingId,
      sessionId,
      startedAt: Date.now(),
      dir: recordingDir,
      screenshots: [],
      domSnapshots: [],
      networkLogs: [],
      consoleLogs: [],
      steps: [],
      metadata: {
        title: options.title || `Recording ${sessionId}`,
        description: options.description || '',
        tags: options.tags || []
      }
    };

    this.activeRecordings.set(sessionId, recordingState);

    // Publish recording started event
    await this.eventBus.publish(EventTypes.RECORDING_STARTED, {
      recordingId,
      sessionId
    }, { sessionId });

    logger.info('Recording started', { sessionId, recordingId });

    return recordingId;
  }

  /**
   * Stop recording for a session
   * 
   * @param {string} sessionId - Session ID
   */
  async stopRecording(sessionId) {
    const recording = this.activeRecordings.get(sessionId);

    if (!recording) {
      return;
    }

    try {
      // Finalize recording
      recording.endedAt = Date.now();
      recording.duration = recording.endedAt - recording.startedAt;

      // Save recording metadata
      await this.saveRecordingMetadata(recording);

      // Publish recording stopped event
      await this.eventBus.publish(EventTypes.RECORDING_STOPPED, {
        recordingId: recording.recordingId,
        sessionId,
        duration: recording.duration,
        screenshotCount: recording.screenshots.length,
        stepCount: recording.steps.length
      }, { sessionId });

      logger.info('Recording stopped', {
        sessionId,
        recordingId: recording.recordingId,
        duration: recording.duration,
        screenshots: recording.screenshots.length
      });

      this.activeRecordings.delete(sessionId);

      return recording.recordingId;
    } catch (error) {
      logger.error('Error stopping recording', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Capture screenshot
   * 
   * @param {string} sessionId - Session ID
   * @param {Buffer} buffer - Screenshot buffer
   * @param {Object} metadata - Screenshot metadata
   */
  async captureScreenshot(sessionId, buffer, metadata = {}) {
    const recording = this.activeRecordings.get(sessionId);

    if (!recording) {
      return null;
    }

    try {
      const screenshotId = `scr_${Date.now()}_${recording.screenshots.length}`;
      const filename = `${screenshotId}.${this.config.screenshotFormat}`;
      const filepath = path.join(recording.dir, 'screenshots', filename);

      // Save screenshot
      await fs.writeFile(filepath, buffer);

      const screenshotData = {
        screenshotId,
        filename,
        path: filepath,
        timestamp: Date.now(),
        stepIndex: metadata.stepIndex || recording.screenshots.length,
        width: metadata.width,
        height: metadata.height,
        format: this.config.screenshotFormat,
        size: buffer.length
      };

      recording.screenshots.push(screenshotData);

      // Publish screenshot captured event
      await this.eventBus.publish(EventTypes.SCREENSHOT_CAPTURED, {
        ...screenshotData,
        buffer: buffer // Include buffer for streaming
      }, { sessionId });

      logger.debug('Screenshot captured', {
        sessionId,
        screenshotId,
        stepIndex: screenshotData.stepIndex
      });

      return screenshotData;
    } catch (error) {
      logger.error('Error capturing screenshot', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Capture DOM snapshot
   * 
   * @param {string} sessionId - Session ID
   * @param {string} html - HTML content
   * @param {Object} metadata - Snapshot metadata
   */
  async captureDOMSnapshot(sessionId, html, metadata = {}) {
    const recording = this.activeRecordings.get(sessionId);

    if (!recording) {
      return null;
    }

    try {
      const snapshotId = `dom_${Date.now()}_${recording.domSnapshots.length}`;
      const filename = `${snapshotId}.html`;
      const filepath = path.join(recording.dir, 'dom-snapshots', filename);

      // Save DOM snapshot
      await fs.writeFile(filepath, html);

      const snapshotData = {
        snapshotId,
        filename,
        path: filepath,
        timestamp: Date.now(),
        stepIndex: metadata.stepIndex || recording.domSnapshots.length,
        url: metadata.url,
        size: Buffer.byteLength(html)
      };

      recording.domSnapshots.push(snapshotData);

      // Publish DOM snapshot event
      await this.eventBus.publish(EventTypes.DOM_SNAPSHOT_CAPTURED, {
        ...snapshotData,
        html: html // Include HTML for processing
      }, { sessionId });

      logger.debug('DOM snapshot captured', {
        sessionId,
        snapshotId,
        stepIndex: snapshotData.stepIndex
      });

      return snapshotData;
    } catch (error) {
      logger.error('Error capturing DOM snapshot', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle step executed event
   * 
   * @param {Object} event - Step executed event
   * @private
   */
  handleStepExecuted(event) {
    const { sessionId } = event.metadata;
    const recording = this.activeRecordings.get(sessionId);

    if (!recording) {
      return;
    }

    // Add step to recording
    recording.steps.push({
      stepIndex: event.data.stepIndex,
      commandType: event.data.commandType,
      command: event.data.command,
      result: event.data.result,
      duration: event.data.duration,
      timestamp: event.timestamp
    });
  }

  /**
   * Handle console log event
   * 
   * @param {Object} event - Console log event
   * @private
   */
  handleConsoleLog(event) {
    const { sessionId } = event.metadata;
    const recording = this.activeRecordings.get(sessionId);

    if (!recording) {
      return;
    }

    recording.consoleLogs.push({
      level: event.data.level,
      message: event.data.message,
      timestamp: event.timestamp
    });
  }

  /**
   * Handle network log event
   * 
   * @param {Object} event - Network log event
   * @private
   */
  handleNetworkLog(event) {
    const { sessionId } = event.metadata;
    const recording = this.activeRecordings.get(sessionId);

    if (!recording) {
      return;
    }

    recording.networkLogs.push({
      method: event.data.method,
      url: event.data.url,
      status: event.data.status,
      duration: event.data.duration,
      timestamp: event.timestamp
    });
  }

  /**
   * Save recording metadata
   * 
   * @param {Object} recording - Recording state
   * @private
   */
  async saveRecordingMetadata(recording) {
    const metadataPath = path.join(recording.dir, 'metadata.json');

    const metadata = {
      recordingId: recording.recordingId,
      sessionId: recording.sessionId,
      startedAt: recording.startedAt,
      endedAt: recording.endedAt,
      duration: recording.duration,
      title: recording.metadata.title,
      description: recording.metadata.description,
      tags: recording.metadata.tags,
      stats: {
        screenshotCount: recording.screenshots.length,
        domSnapshotCount: recording.domSnapshots.length,
        networkLogCount: recording.networkLogs.length,
        consoleLogCount: recording.consoleLogs.length,
        stepCount: recording.steps.length
      },
      screenshots: recording.screenshots,
      domSnapshots: recording.domSnapshots,
      steps: recording.steps
    };

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Get recording by ID
   * 
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Object>} Recording data
   */
  async getRecording(recordingId) {
    const recordingDir = path.join(this.config.storageDir, recordingId);
    const metadataPath = path.join(recordingDir, 'metadata.json');

    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(metadataContent);
    } catch (error) {
      logger.error('Error loading recording', {
        recordingId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * List all recordings
   * 
   * @returns {Promise<Array>} List of recordings
   */
  async listRecordings() {
    try {
      const entries = await fs.readdir(this.config.storageDir, { withFileTypes: true });
      const recordings = [];

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('rec_')) {
          const recording = await this.getRecording(entry.name);
          if (recording) {
            recordings.push({
              recordingId: recording.recordingId,
              sessionId: recording.sessionId,
              title: recording.title,
              startedAt: recording.startedAt,
              duration: recording.duration,
              stats: recording.stats
            });
          }
        }
      }

      return recordings.sort((a, b) => b.startedAt - a.startedAt);
    } catch (error) {
      logger.error('Error listing recordings', { error: error.message });
      return [];
    }
  }

  /**
   * Generate replay URL
   * 
   * @param {string} recordingId - Recording ID
   * @returns {string} Replay URL
   */
  generateReplayURL(recordingId) {
    // Format similar to dashcam.io:
    // https://app.testdriver-server.com/replay/:recordingId?share=:token&embed=true
    const baseUrl = this.config.baseUrl || 'http://localhost:3000';
    return `${baseUrl}/replay/${recordingId}`;
  }

  /**
   * Get recording statistics
   * 
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      activeRecordings: this.activeRecordings.size,
      storageDir: this.config.storageDir
    };
  }

  /**
   * Get recording metadata by session ID
   * 
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Recording metadata
   */
  async getRecordingMetadata(sessionId) {
    // Check if there's an active recording for this session
    const activeRecording = this.activeRecordings.get(sessionId);
    if (activeRecording) {
      return {
        recordingId: activeRecording.recordingId,
        sessionId: activeRecording.sessionId,
        startedAt: activeRecording.startedAt,
        duration: Date.now() - activeRecording.startedAt,
        status: 'active',
        stats: {
          screenshots: activeRecording.screenshots.length,
          domSnapshots: activeRecording.domSnapshots.length,
          steps: activeRecording.steps.length,
          networkLogs: activeRecording.networkLogs.length,
          consoleLogs: activeRecording.consoleLogs.length
        }
      };
    }

    // If not active, search for completed recordings
    try {
      const entries = await fs.readdir(this.config.storageDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('rec_')) {
          const recording = await this.getRecording(entry.name);
          if (recording && recording.sessionId === sessionId) {
            return {
              recordingId: recording.recordingId,
              sessionId: recording.sessionId,
              startedAt: recording.startedAt,
              duration: recording.duration,
              status: 'completed',
              stats: recording.stats
            };
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Error getting recording metadata', {
        sessionId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Delete a recording by session ID
   * 
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteRecording(sessionId) {
    try {
      // Stop active recording if exists
      if (this.activeRecordings.has(sessionId)) {
        await this.stopRecording(sessionId);
      }

      // Find and delete recording directory
      const entries = await fs.readdir(this.config.storageDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('rec_')) {
          const recording = await this.getRecording(entry.name);
          if (recording && recording.sessionId === sessionId) {
            const recordingDir = path.join(this.config.storageDir, entry.name);
            
            // Delete the entire recording directory
            await fs.rm(recordingDir, { recursive: true, force: true });
            
            logger.info('Recording deleted', {
              sessionId,
              recordingId: entry.name
            });
            
            return true;
          }
        }
      }

      logger.warn('No recording found for session', { sessionId });
      return false;
    } catch (error) {
      logger.error('Error deleting recording', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Shutdown recording service
   */
  async shutdown() {
    logger.info('Shutting down RecordingService');

    // Stop all active recordings
    for (const sessionId of this.activeRecordings.keys()) {
      await this.stopRecording(sessionId);
    }

    this.initialized = false;
    logger.info('RecordingService shutdown complete');
  }
}

module.exports = RecordingService;
