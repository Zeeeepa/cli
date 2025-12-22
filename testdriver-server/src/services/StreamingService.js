/**
 * Streaming Service
 * 
 * Manages real-time streaming of test execution to clients:
 * - Screenshot streaming with compression
 * - Step-by-step execution broadcasting
 * - Bandwidth optimization
 * - Quality adjustment based on network conditions
 */

const { EventTypes } = require('../models/events');
const logger = require('../utils/logger');

class StreamingService {
  constructor(eventBus, webSocketService, config = {}) {
    this.eventBus = eventBus;
    this.webSocketService = webSocketService;
    this.config = {
      screenshotQuality: config.screenshotQuality || 80,
      maxScreenshotWidth: config.maxScreenshotWidth || 1920,
      frameSkipOnHighLoad: config.frameSkipOnHighLoad !== false,
      compressionLevel: config.compressionLevel || 6,
      ...config
    };

    this.activeStreams = new Map(); // sessionId -> stream state
    this.initialized = false;
  }

  /**
   * Initialize streaming service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    // Subscribe to relevant events
    this.setupEventSubscriptions();

    this.initialized = true;
    logger.info('StreamingService initialized', {
      screenshotQuality: this.config.screenshotQuality,
      maxWidth: this.config.maxScreenshotWidth
    });
  }

  /**
   * Setup event subscriptions
   * 
   * @private
   */
  setupEventSubscriptions() {
    // Subscribe to step execution events
    this.eventBus.subscribe(EventTypes.STEP_EXECUTED, (event) => {
      this.handleStepExecuted(event);
    });

    this.eventBus.subscribe(EventTypes.STEP_FAILED, (event) => {
      this.handleStepFailed(event);
    });

    // Subscribe to screenshot events
    this.eventBus.subscribe(EventTypes.SCREENSHOT_CAPTURED, (event) => {
      this.handleScreenshotCaptured(event);
    });

    // Subscribe to session lifecycle events
    this.eventBus.subscribe(EventTypes.SESSION_STARTED, (event) => {
      this.handleSessionStarted(event);
    });

    this.eventBus.subscribe(EventTypes.SESSION_ENDED, (event) => {
      this.handleSessionEnded(event);
    });

    // Subscribe to console/network logs
    this.eventBus.subscribe(EventTypes.CONSOLE_LOG_CAPTURED, (event) => {
      this.handleConsolelog(event);
    });

    this.eventBus.subscribe(EventTypes.NETWORK_LOG_CAPTURED, (event) => {
      this.handleNetworkLog(event);
    });

    logger.info('StreamingService subscribed to events');
  }

  /**
   * Start streaming for a session
   * 
   * @param {string} sessionId - Session ID
   * @param {Object} options - Streaming options
   */
  async startStreaming(sessionId, options = {}) {
    if (this.activeStreams.has(sessionId)) {
      logger.warn('Streaming already active for session', { sessionId });
      return;
    }

    const streamState = {
      sessionId,
      startedAt: Date.now(),
      frameCount: 0,
      skippedFrames: 0,
      bytesStreamed: 0,
      quality: options.quality || this.config.screenshotQuality,
      paused: false,
      speed: 1.0
    };

    this.activeStreams.set(sessionId, streamState);

    // Publish streaming started event
    await this.eventBus.publish(EventTypes.STREAMING_STARTED, {
      sessionId,
      options
    }, { sessionId });

    logger.info('Streaming started', { sessionId });
  }

  /**
   * Stop streaming for a session
   * 
   * @param {string} sessionId - Session ID
   */
  async stopStreaming(sessionId) {
    const streamState = this.activeStreams.get(sessionId);
    
    if (!streamState) {
      return;
    }

    // Publish streaming stopped event
    await this.eventBus.publish(EventTypes.STREAMING_STOPPED, {
      sessionId,
      stats: this.getStreamStats(sessionId)
    }, { sessionId });

    this.activeStreams.delete(sessionId);

    logger.info('Streaming stopped', {
      sessionId,
      duration: Date.now() - streamState.startedAt,
      frameCount: streamState.frameCount
    });
  }

  /**
   * Pause streaming
   * 
   * @param {string} sessionId - Session ID
   */
  pauseStreaming(sessionId) {
    const streamState = this.activeStreams.get(sessionId);
    
    if (streamState) {
      streamState.paused = true;
      logger.info('Streaming paused', { sessionId });
    }
  }

  /**
   * Resume streaming
   * 
   * @param {string} sessionId - Session ID
   */
  resumeStreaming(sessionId) {
    const streamState = this.activeStreams.get(sessionId);
    
    if (streamState) {
      streamState.paused = false;
      logger.info('Streaming resumed', { sessionId });
    }
  }

  /**
   * Set streaming speed
   * 
   * @param {string} sessionId - Session ID
   * @param {number} speed - Playback speed (0.5, 1.0, 2.0, etc.)
   */
  setStreamingSpeed(sessionId, speed) {
    const streamState = this.activeStreams.get(sessionId);
    
    if (streamState) {
      streamState.speed = speed;
      logger.info('Streaming speed changed', { sessionId, speed });
    }
  }

  /**
   * Handle session started event
   * 
   * @param {Object} event - Session started event
   * @private
   */
  async handleSessionStarted(event) {
    const { sessionId } = event.metadata;

    // Auto-start streaming if enabled
    if (this.config.autoStartStreaming) {
      await this.startStreaming(sessionId);
    }
  }

  /**
   * Handle session ended event
   * 
   * @param {Object} event - Session ended event
   * @private
   */
  async handleSessionEnded(event) {
    const { sessionId } = event.metadata;

    // Stop streaming
    await this.stopStreaming(sessionId);
  }

  /**
   * Handle step executed event
   * 
   * @param {Object} event - Step executed event
   * @private
   */
  handleStepExecuted(event) {
    const { sessionId } = event.metadata;
    const streamState = this.activeStreams.get(sessionId);

    if (!streamState || streamState.paused) {
      return;
    }

    // Broadcast step execution to viewers
    this.webSocketService.broadcastToSessionByType(
      sessionId,
      'step-executed',
      {
        stepIndex: event.data.stepIndex,
        commandType: event.data.commandType,
        command: event.data.command,
        result: event.data.result,
        duration: event.data.duration,
        timestamp: event.timestamp
      },
      ['viewer', 'controller']
    );

    streamState.frameCount++;
  }

  /**
   * Handle step failed event
   * 
   * @param {Object} event - Step failed event
   * @private
   */
  handleStepFailed(event) {
    const { sessionId } = event.metadata;
    const streamState = this.activeStreams.get(sessionId);

    if (!streamState || streamState.paused) {
      return;
    }

    // Broadcast step failure to viewers
    this.webSocketService.broadcastToSessionByType(
      sessionId,
      'step-failed',
      {
        stepIndex: event.data.stepIndex,
        commandType: event.data.commandType,
        command: event.data.command,
        error: event.data.error,
        timestamp: event.timestamp
      },
      ['viewer', 'controller']
    );
  }

  /**
   * Handle screenshot captured event
   * 
   * @param {Object} event - Screenshot captured event
   * @private
   */
  async handleScreenshotCaptured(event) {
    const { sessionId } = event.metadata;
    const streamState = this.activeStreams.get(sessionId);

    if (!streamState || streamState.paused) {
      return;
    }

    try {
      // Process screenshot for streaming
      const processedScreenshot = await this.processScreenshotForStreaming(
        event.data,
        streamState.quality
      );

      // Broadcast screenshot to viewers
      this.webSocketService.broadcastToSessionByType(
        sessionId,
        'screenshot',
        {
          screenshotId: event.data.screenshotId,
          stepIndex: event.data.stepIndex,
          data: processedScreenshot.data,
          width: processedScreenshot.width,
          height: processedScreenshot.height,
          format: processedScreenshot.format,
          size: processedScreenshot.size,
          timestamp: event.timestamp
        },
        ['viewer', 'dashcam']
      );

      streamState.bytesStreamed += processedScreenshot.size;
    } catch (error) {
      logger.error('Error processing screenshot for streaming', {
        sessionId,
        error: error.message
      });
    }
  }

  /**
   * Handle console log event
   * 
   * @param {Object} event - Console log event
   * @private
   */
  handleConsoleLog(event) {
    const { sessionId } = event.metadata;
    const streamState = this.activeStreams.get(sessionId);

    if (!streamState || streamState.paused) {
      return;
    }

    // Broadcast console log to viewers
    this.webSocketService.broadcastToSessionByType(
      sessionId,
      'console-log',
      {
        level: event.data.level,
        message: event.data.message,
        args: event.data.args,
        timestamp: event.timestamp
      },
      ['viewer', 'controller']
    );
  }

  /**
   * Handle network log event
   * 
   * @param {Object} event - Network log event
   * @private
   */
  handleNetworkLog(event) {
    const { sessionId } = event.metadata;
    const streamState = this.activeStreams.get(sessionId);

    if (!streamState || streamState.paused) {
      return;
    }

    // Broadcast network log to viewers
    this.webSocketService.broadcastToSessionByType(
      sessionId,
      'network-log',
      {
        method: event.data.method,
        url: event.data.url,
        status: event.data.status,
        duration: event.data.duration,
        timestamp: event.timestamp
      },
      ['viewer', 'controller']
    );
  }

  /**
   * Process screenshot for streaming
   * 
   * Applies compression and resizing for optimal streaming performance
   * 
   * @param {Object} screenshotData - Original screenshot data
   * @param {number} quality - Quality setting (0-100)
   * @returns {Promise<Object>} Processed screenshot
   * @private
   */
  async processScreenshotForStreaming(screenshotData, quality) {
    // If buffer is provided, convert to base64
    if (screenshotData.buffer) {
      return {
        data: screenshotData.buffer.toString('base64'),
        width: screenshotData.width,
        height: screenshotData.height,
        format: screenshotData.format || 'png',
        size: screenshotData.buffer.length
      };
    }

    // If path is provided, read and process
    if (screenshotData.path) {
      // TODO: Implement actual image processing with sharp
      // For now, just return metadata
      return {
        url: `/api/v1/screenshots/${screenshotData.screenshotId}`,
        width: screenshotData.width,
        height: screenshotData.height,
        format: screenshotData.format || 'png',
        size: 0
      };
    }

    throw new Error('Screenshot data must include buffer or path');
  }

  /**
   * Get streaming statistics
   * 
   * @param {string} sessionId - Session ID
   * @returns {Object} Statistics
   */
  getStreamStats(sessionId) {
    const streamState = this.activeStreams.get(sessionId);

    if (!streamState) {
      return null;
    }

    const duration = Date.now() - streamState.startedAt;
    const fps = streamState.frameCount / (duration / 1000);

    return {
      sessionId,
      duration,
      frameCount: streamState.frameCount,
      skippedFrames: streamState.skippedFrames,
      bytesStreamed: streamState.bytesStreamed,
      fps: fps.toFixed(2),
      quality: streamState.quality,
      paused: streamState.paused,
      speed: streamState.speed
    };
  }

  /**
   * Get all active streams
   * 
   * @returns {Array} Active stream stats
   */
  getAllStreams() {
    const streams = [];

    for (const sessionId of this.activeStreams.keys()) {
      streams.push(this.getStreamStats(sessionId));
    }

    return streams;
  }

  /**
   * Shutdown streaming service
   */
  async shutdown() {
    logger.info('Shutting down StreamingService');

    // Stop all active streams
    for (const sessionId of this.activeStreams.keys()) {
      await this.stopStreaming(sessionId);
    }

    this.initialized = false;
    logger.info('StreamingService shutdown complete');
  }
}

module.exports = StreamingService;

