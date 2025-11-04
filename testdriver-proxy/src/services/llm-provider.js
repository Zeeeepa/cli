/**
 * LLM Provider Service
 * Handles communication with various LLM providers (Anthropic, OpenAI, Z.ai, custom)
 */

const axios = require('axios');
const config = require('../config');
const { getLogger } = require('../utils/logger');

const logger = getLogger('llm-provider');

class LLMProvider {
  constructor(options = {}) {
    this.provider = options.provider || config.llm.provider;
    this.apiKey = options.apiKey || config.llm.apiKey;
    this.baseUrl = options.baseUrl || config.llm.baseUrl;
    this.model = options.model || config.llm.model;
    this.maxTokens = options.maxTokens || config.llm.maxTokens;
    this.temperature = options.temperature || config.llm.temperature;
    this.timeout = options.timeout || config.llm.timeout;
  }

  /**
   * Call LLM with messages
   */
  async call(messages, systemPrompt = null, options = {}) {
    const stream = options.stream || false;
    const retries = options.retries || config.testdriver.maxRetries;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this._makeRequest(messages, systemPrompt, stream);
        logger.debug(`LLM call successful on attempt ${attempt}`);
        return response;
      } catch (error) {
        const isRetryable = this._isRetryableError(error);
        const isLastAttempt = attempt === retries;

        logger.error(`LLM API error (attempt ${attempt}/${retries}):`, {
          status: error.response?.status,
          code: error.code,
          message: error.message,
          retryable: isRetryable
        });

        if (isRetryable && !isLastAttempt) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw this._enhanceError(error);
      }
    }
  }

  /**
   * Make HTTP request to LLM provider
   */
  async _makeRequest(messages, systemPrompt, stream) {
    const { url, headers, body } = this._prepareRequest(messages, systemPrompt, stream);

    logger.debug('LLM Request:', { url, provider: this.provider, model: this.model });

    const response = await axios.post(url, body, {
      headers,
      responseType: stream ? 'stream' : 'json',
      timeout: this.timeout
    });

    return response.data;
  }

  /**
   * Prepare request based on provider
   */
  _prepareRequest(messages, systemPrompt, stream) {
    switch (this.provider.toLowerCase()) {
      case 'anthropic':
      case 'zai':
        return this._prepareAnthropicRequest(messages, systemPrompt, stream);
      
      case 'openai':
        return this._prepareOpenAIRequest(messages, systemPrompt, stream);
      
      default:
        // Assume OpenAI-compatible API
        return this._prepareOpenAIRequest(messages, systemPrompt, stream);
    }
  }

  /**
   * Prepare Anthropic-style request (used by Z.ai too)
   */
  _prepareAnthropicRequest(messages, systemPrompt, stream) {
    const url = `${this.baseUrl}/v1/messages`;
    
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };

    const body = {
      model: this.model,
      max_tokens: this.maxTokens,
      messages: messages,
      stream: stream
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    return { url, headers, body };
  }

  /**
   * Prepare OpenAI-style request
   */
  _prepareOpenAIRequest(messages, systemPrompt, stream) {
    const url = `${this.baseUrl}/v1/chat/completions`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    const formattedMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const body = {
      model: this.model,
      messages: formattedMessages,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      stream: stream
    };

    return { url, headers, body };
  }

  /**
   * Check if error is retryable
   */
  _isRetryableError(error) {
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    const status = error.response?.status;
    return status === 429 || status === 500 || status === 502 || status === 503;
  }

  /**
   * Enhance error with helpful message
   */
  _enhanceError(error) {
    const status = error.response?.status;
    
    if (status === 401 || status === 403) {
      return new Error('Authentication failed. Please check your API key.');
    }
    
    if (status === 429) {
      return new Error('Rate limit exceeded. Please try again later.');
    }
    
    if (error.code === 'ETIMEDOUT') {
      return new Error('Request timeout. The API took too long to respond.');
    }
    
    if (error.code === 'ECONNREFUSED') {
      return new Error('Connection refused. Please check the API URL.');
    }

    return error;
  }

  /**
   * Extract text content from response
   */
  extractText(response) {
    // Anthropic format
    if (response.content && Array.isArray(response.content)) {
      return response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
    }

    // OpenAI format
    if (response.choices && response.choices[0]?.message?.content) {
      return response.choices[0].message.content;
    }

    logger.warn('Could not extract text from response:', response);
    return '';
  }

  /**
   * Format messages for vision input (with images)
   */
  formatVisionMessage(text, imageBase64) {
    if (this.provider === 'anthropic' || this.provider === 'zai') {
      return {
        role: 'user',
        content: [
          { type: 'text', text },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: imageBase64
            }
          }
        ]
      };
    } else {
      // OpenAI format
      return {
        role: 'user',
        content: [
          { type: 'text', text },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${imageBase64}`
            }
          }
        ]
      };
    }
  }
}

module.exports = LLMProvider;

