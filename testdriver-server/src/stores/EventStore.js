/**
 * Event Store - Persistent storage for event sourcing
 * 
 * Provides:
 * - Append-only event log storage
 * - Event indexing and querying
 * - Log rotation and archival
 * - Compression for old events
 */

const fs = require('fs').promises;
const path = require('path');
const { createReadStream, createWriteStream } = require('fs');
const readline = require('readline');
const { createGzip, createGunzip } = require('zlib');
const logger = require('../utils/logger');

class EventStore {
  constructor(config = {}) {
    this.storageDir = config.storageDir || path.join(process.cwd(), 'data', 'events');
    this.maxFileSize = config.maxFileSize || 10 * 1024 * 1024; // 10MB default
    this.compressionEnabled = config.compression !== false;
    this.currentLogFile = null;
    this.currentLogSize = 0;
    this.writeStream = null;
    this.initialized = false;
    
    // Index: sessionId -> [event files]
    this.sessionIndex = new Map();
    
    // Index: event type -> [event files]
    this.typeIndex = new Map();
  }

  /**
   * Initialize event store
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Create storage directory if it doesn't exist
      await fs.mkdir(this.storageDir, { recursive: true });

      // Create current log file
      await this.createNewLogFile();

      // Build indexes from existing files
      await this.buildIndexes();

      this.initialized = true;
      logger.info('EventStore initialized', {
        storageDir: this.storageDir,
        maxFileSize: this.maxFileSize,
        compression: this.compressionEnabled
      });
    } catch (error) {
      logger.error('Failed to initialize EventStore', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Store an event
   * 
   * @param {Object} event - Event to store
   */
  async store(event) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Serialize event
      const eventLine = JSON.stringify(event) + '\n';
      const eventSize = Buffer.byteLength(eventLine);

      // Check if we need to rotate log file
      if (this.currentLogSize + eventSize > this.maxFileSize) {
        await this.rotateLogFile();
      }

      // Write event
      await this.writeToLog(eventLine);
      this.currentLogSize += eventSize;

      // Update indexes
      this.updateIndexes(event, this.currentLogFile);

      logger.debug('Event stored', {
        eventId: event.id,
        type: event.type,
        file: this.currentLogFile
      });
    } catch (error) {
      logger.error('Error storing event', {
        eventId: event.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Store multiple events (batch)
   * 
   * @param {Array} events - Events to store
   */
  async storeBatch(events) {
    if (!this.initialized) {
      await this.initialize();
    }

    for (const event of events) {
      await this.store(event);
    }

    logger.info(`Stored batch of ${events.length} events`);
  }

  /**
   * Get events by session ID
   * 
   * @param {string} sessionId - Session ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Events
   */
  async getBySession(sessionId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const files = this.sessionIndex.get(sessionId) || [];
    const events = [];

    for (const file of files) {
      const fileEvents = await this.readEventsFromFile(file, {
        filter: (event) => event.metadata?.sessionId === sessionId
      });
      events.push(...fileEvents);
    }

    // Apply additional filters
    return this.applyFilters(events, options);
  }

  /**
   * Get events by type
   * 
   * @param {string} type - Event type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Events
   */
  async getByType(type, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const files = this.typeIndex.get(type) || [];
    const events = [];

    for (const file of files) {
      const fileEvents = await this.readEventsFromFile(file, {
        filter: (event) => event.type === type
      });
      events.push(...fileEvents);
    }

    return this.applyFilters(events, options);
  }

  /**
   * Get events in time range
   * 
   * @param {number} since - Start timestamp
   * @param {number} until - End timestamp
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Events
   */
  async getByTimeRange(since, until, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Get all log files in date range
    const files = await this.getLogFilesInRange(since, until);
    const events = [];

    for (const file of files) {
      const fileEvents = await this.readEventsFromFile(file, {
        filter: (event) => event.timestamp >= since && event.timestamp <= until
      });
      events.push(...fileEvents);
    }

    return this.applyFilters(events, options);
  }

  /**
   * Query events with complex filters
   * 
   * @param {Object} query - Query object
   * @returns {Promise<Array>} Events
   */
  async query(query = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    let events = [];

    // If sessionId is provided, use session index
    if (query.sessionId) {
      events = await this.getBySession(query.sessionId);
    }
    // If type is provided, use type index
    else if (query.type) {
      events = await this.getByType(query.type);
    }
    // If time range is provided
    else if (query.since || query.until) {
      const since = query.since || 0;
      const until = query.until || Date.now();
      events = await this.getByTimeRange(since, until);
    }
    // Otherwise, read all events (expensive!)
    else {
      logger.warn('Query without indexes - reading all events');
      const files = await this.getAllLogFiles();
      for (const file of files) {
        const fileEvents = await this.readEventsFromFile(file);
        events.push(...fileEvents);
      }
    }

    return this.applyFilters(events, query);
  }

  /**
   * Flush events to disk
   * 
   * @param {Array} events - Events to flush
   */
  async flush(events) {
    if (events && events.length > 0) {
      await this.storeBatch(events);
    }

    if (this.writeStream) {
      return new Promise((resolve, reject) => {
        this.writeStream.end((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }

  /**
   * Archive old log files
   * 
   * @param {number} olderThan - Archive files older than this timestamp
   */
  async archive(olderThan) {
    const files = await this.getAllLogFiles();
    const archiveDir = path.join(this.storageDir, 'archive');
    await fs.mkdir(archiveDir, { recursive: true });

    let archivedCount = 0;

    for (const file of files) {
      const stats = await fs.stat(file);
      if (stats.mtimeMs < olderThan) {
        // Compress and move to archive
        const filename = path.basename(file);
        const archivePath = path.join(archiveDir, `${filename}.gz`);

        await this.compressFile(file, archivePath);
        await fs.unlink(file);
        
        archivedCount++;
      }
    }

    logger.info(`Archived ${archivedCount} log files`);
    return archivedCount;
  }

  /**
   * Create new log file
   * 
   * @private
   */
  async createNewLogFile() {
    const timestamp = Date.now();
    const filename = `events-${timestamp}.log`;
    this.currentLogFile = path.join(this.storageDir, filename);
    this.currentLogSize = 0;

    // Create write stream
    if (this.writeStream) {
      this.writeStream.end();
    }

    this.writeStream = createWriteStream(this.currentLogFile, { flags: 'a' });

    logger.debug('Created new log file', { file: this.currentLogFile });
  }

  /**
   * Rotate log file when size limit is reached
   * 
   * @private
   */
  async rotateLogFile() {
    logger.info('Rotating log file', {
      oldFile: this.currentLogFile,
      size: this.currentLogSize
    });

    // Close current write stream
    if (this.writeStream) {
      await new Promise((resolve) => this.writeStream.end(resolve));
    }

    // Optionally compress old log file
    if (this.compressionEnabled) {
      const compressedFile = `${this.currentLogFile}.gz`;
      await this.compressFile(this.currentLogFile, compressedFile);
      await fs.unlink(this.currentLogFile);
    }

    // Create new log file
    await this.createNewLogFile();
  }

  /**
   * Write event line to log
   * 
   * @param {string} eventLine - Serialized event
   * @private
   */
  async writeToLog(eventLine) {
    return new Promise((resolve, reject) => {
      this.writeStream.write(eventLine, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  /**
   * Read events from a file
   * 
   * @param {string} file - File path
   * @param {Object} options - Read options
   * @returns {Promise<Array>} Events
   * @private
   */
  async readEventsFromFile(file, options = {}) {
    const events = [];
    const isCompressed = file.endsWith('.gz');

    try {
      const stream = isCompressed
        ? createReadStream(file).pipe(createGunzip())
        : createReadStream(file);

      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
      });

      for await (const line of rl) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line);
            
            // Apply filter if provided
            if (!options.filter || options.filter(event)) {
              events.push(event);
            }
          } catch (parseError) {
            logger.warn('Failed to parse event line', {
              file,
              error: parseError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error reading events from file', {
        file,
        error: error.message
      });
    }

    return events;
  }

  /**
   * Compress a file
   * 
   * @param {string} source - Source file
   * @param {string} destination - Destination file
   * @private
   */
  async compressFile(source, destination) {
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(source);
      const writeStream = createWriteStream(destination);
      const gzip = createGzip();

      readStream
        .pipe(gzip)
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });
  }

  /**
   * Build indexes from existing files
   * 
   * @private
   */
  async buildIndexes() {
    const files = await this.getAllLogFiles();

    for (const file of files) {
      const events = await this.readEventsFromFile(file);
      
      for (const event of events) {
        this.updateIndexes(event, file);
      }
    }

    logger.info('Built event indexes', {
      sessions: this.sessionIndex.size,
      types: this.typeIndex.size
    });
  }

  /**
   * Update indexes for an event
   * 
   * @param {Object} event - Event
   * @param {string} file - File containing the event
   * @private
   */
  updateIndexes(event, file) {
    // Session index
    if (event.metadata?.sessionId) {
      const sessionId = event.metadata.sessionId;
      if (!this.sessionIndex.has(sessionId)) {
        this.sessionIndex.set(sessionId, []);
      }
      const files = this.sessionIndex.get(sessionId);
      if (!files.includes(file)) {
        files.push(file);
      }
    }

    // Type index
    if (event.type) {
      if (!this.typeIndex.has(event.type)) {
        this.typeIndex.set(event.type, []);
      }
      const files = this.typeIndex.get(event.type);
      if (!files.includes(file)) {
        files.push(file);
      }
    }
  }

  /**
   * Get all log files
   * 
   * @returns {Promise<Array>} File paths
   * @private
   */
  async getAllLogFiles() {
    const files = await fs.readdir(this.storageDir);
    return files
      .filter(f => f.startsWith('events-') && (f.endsWith('.log') || f.endsWith('.log.gz')))
      .map(f => path.join(this.storageDir, f))
      .sort();
  }

  /**
   * Get log files in date range
   * 
   * @param {number} since - Start timestamp
   * @param {number} until - End timestamp
   * @returns {Promise<Array>} File paths
   * @private
   */
  async getLogFilesInRange(since, until) {
    const allFiles = await this.getAllLogFiles();
    const filesInRange = [];

    for (const file of allFiles) {
      // Extract timestamp from filename: events-<timestamp>.log
      const match = path.basename(file).match(/events-(\d+)\.log/);
      if (match) {
        const fileTimestamp = parseInt(match[1]);
        // Include file if it might contain events in range
        if (fileTimestamp <= until) {
          filesInRange.push(file);
        }
      }
    }

    return filesInRange;
  }

  /**
   * Apply filters to events
   * 
   * @param {Array} events - Events to filter
   * @param {Object} filters - Filter options
   * @returns {Array} Filtered events
   * @private
   */
  applyFilters(events, filters) {
    let filtered = events;

    // Filter by event type
    if (filters.type) {
      filtered = filtered.filter(e => e.type === filters.type);
    }

    // Filter by time range
    if (filters.since) {
      filtered = filtered.filter(e => e.timestamp >= filters.since);
    }

    if (filters.until) {
      filtered = filtered.filter(e => e.timestamp <= filters.until);
    }

    // Sort by timestamp
    if (filters.sort === 'asc') {
      filtered.sort((a, b) => a.timestamp - b.timestamp);
    } else if (filters.sort === 'desc') {
      filtered.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Limit results
    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Get store statistics
   * 
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    const files = await this.getAllLogFiles();
    let totalSize = 0;
    
    for (const file of files) {
      const stats = await fs.stat(file);
      totalSize += stats.size;
    }

    return {
      fileCount: files.length,
      totalSize,
      currentFile: this.currentLogFile,
      currentSize: this.currentLogSize,
      sessionCount: this.sessionIndex.size,
      eventTypeCount: this.typeIndex.size
    };
  }
}

module.exports = EventStore;

