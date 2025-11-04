/**
 * Cache Store
 * Simple in-memory cache with TTL support
 */

const { getLogger } = require('../utils/logger');

const logger = getLogger('cache-store');

class CacheStore {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 3600000; // 1 hour default
  }

  set(key, value, ttl = this.defaultTTL) {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expiresAt = ttl ? Date.now() + ttl : null;

    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    logger.debug(`Cache set: ${key} (TTL: ${ttl}ms)`);
  }

  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug(`Cache expired: ${key}`);
      return undefined;
    }

    logger.debug(`Cache hit: ${key}`);
    return entry.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  clear() {
    const count = this.cache.size;
    this.cache.clear();
    logger.info(`Cache cleared: ${count} entries`);
  }

  size() {
    return this.cache.size;
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cache cleanup: removed ${cleaned} expired entries`);
    }

    return cleaned;
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.keys())
    };
  }
}

module.exports = CacheStore;
