/**
 * Configuration Management
 * Centralizes all environment variables and configuration
 */

require('dotenv').config();

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development',
    debug: process.env.DEBUG === 'true'
  },

  // LLM Provider Configuration
  llm: {
    provider: process.env.API_PROVIDER || 'anthropic', // anthropic, openai, zai, custom
    apiKey: process.env.API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
    baseUrl: process.env.API_BASE_URL || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    model: process.env.MODEL || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    maxTokens: parseInt(process.env.MAX_TOKENS || '8000'),
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
    timeout: parseInt(process.env.LLM_TIMEOUT || '120000')
  },

  // TestDriver Configuration
  testdriver: {
    version: '6.0.0',
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT || '30000')
  },

  // Security
  security: {
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*']
  },

  // Storage
  storage: {
    testDir: process.env.TEST_DIR || './tests/generated',
    sessionDir: process.env.SESSION_DIR || './sessions',
    logDir: process.env.LOG_DIR || './logs'
  },

  // Feature Flags
  features: {
    selfHealing: process.env.ENABLE_SELF_HEALING !== 'false',
    testGeneration: process.env.ENABLE_TEST_GENERATION !== 'false',
    caching: process.env.ENABLE_CACHING === 'true',
    metrics: process.env.ENABLE_METRICS === 'true'
  }
};

// Validation
function validateConfig() {
  const errors = [];

  if (!config.llm.apiKey) {
    errors.push('LLM API key is required (API_KEY or ANTHROPIC_AUTH_TOKEN)');
  }

  if (!config.llm.baseUrl) {
    errors.push('LLM base URL is required (API_BASE_URL or ANTHROPIC_BASE_URL)');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Validate on load
try {
  validateConfig();
} catch (error) {
  console.error('❌ Configuration Error:', error.message);
  process.exit(1);
}

module.exports = config;

