#!/usr/bin/env node
/**
 * TestDriver.ai Proxy Server
 * Translates TestDriver.ai API calls to Z.ai GLM-4.6V (or any LLM API)
 * 
 * Usage:
 *   TD_API_ROOT=http://localhost:3000 npx testdriverai run test.yaml
 */

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');
const morgan = require('morgan');
const winston = require('winston');
const cors = require('cors');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

// Configuration
const config = {
  port: parseInt(process.env.PORT || '3000'),
  apiProvider: process.env.API_PROVIDER || 'zai',
  apiKey: process.env.API_KEY || process.env.ANTHROPIC_API_KEY,
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.z.ai/api/anthropic',
  model: process.env.MODEL || 'glm-4.5V',
  maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
  temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
  debug: process.env.DEBUG === 'true'
};

// Logging setup
const logger = winston.createLogger({
  level: config.debug ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'proxy.log' })
  ]
});

// Express app
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ============================================================================
// Middleware
// ============================================================================

// Request ID tracking
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  logger.info(`[${req.id}] ${req.method} ${req.path}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res) => {
    logger.warn(`[${req.id}] Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});
app.use('/api/', limiter);

// CORS
app.use(cors());

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Request timeout
app.use((req, res, next) => {
  req.setTimeout(120000); // 120 seconds
  res.setTimeout(120000);
  next();
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert base64 screenshot to proper format for vision models
 */
async function processScreenshot(base64Image) {
  if (!base64Image) return null;
  
  try {
    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Compress if needed
    const processed = await sharp(buffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 80 })
      .toBuffer();
    
    return processed.toString('base64');
  } catch (error) {
    logger.error('Screenshot processing error:', error);
    return base64Image;
  }
}

/**
 * Call the configured LLM API (Z.ai, OpenAI, Anthropic, etc.) with retry logic
 */
async function callLLM(messages, systemPrompt, stream = false, retries = 3) {
  const headers = {
    'Content-Type': 'application/json'
  };

  let requestBody;
  let url;

  // Configure based on API provider
  if (config.apiProvider === 'zai' || config.apiProvider === 'anthropic') {
    url = `${config.apiBaseUrl}/v1/messages`;
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    
    requestBody = {
      model: config.model,
      max_tokens: config.maxTokens,
      messages: messages,
      stream: stream
    };
    
    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }
  } else {
    // OpenAI-compatible format (default)
    url = `${config.apiBaseUrl}/chat/completions`;
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    
    const formattedMessages = systemPrompt 
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;
    
    requestBody = {
      model: config.model,
      messages: formattedMessages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: stream
    };
  }

  logger.debug('LLM Request:', { url, body: requestBody });

  // Retry logic for transient errors
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(url, requestBody, { 
        headers,
        responseType: stream ? 'stream' : 'json',
        timeout: 120000
      });
      
      logger.debug(`LLM API call successful on attempt ${attempt}`);
      return response.data;
    } catch (error) {
      const isRetryable = error.code === 'ECONNRESET' || 
                          error.code === 'ETIMEDOUT' ||
                          error.response?.status === 429 ||
                          error.response?.status === 500 ||
                          error.response?.status === 502 ||
                          error.response?.status === 503;
      
      const isLastAttempt = attempt === retries;
      
      logger.error(`LLM API Error (attempt ${attempt}/${retries}):`, {
        status: error.response?.status,
        code: error.code,
        data: error.response?.data,
        message: error.message,
        retryable: isRetryable
      });
      
      if (isRetryable && !isLastAttempt) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
        logger.info(`Retrying LLM API call in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Enhanced error message for common issues
      if (error.response?.status === 401) {
        throw new Error('API authentication failed. Please check your API key.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Request timeout. The API took too long to respond.');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Connection refused. Please check the API URL.');
      }
      
      throw error;
    }
  }
}

/**
 * Extract text content from LLM response
 */
function extractTextContent(response, provider = config.apiProvider) {
  if (provider === 'zai' || provider === 'anthropic') {
    // Anthropic format
    if (response.content && Array.isArray(response.content)) {
      return response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
    }
  } else {
    // OpenAI format (used by Z.ai, OpenAI, and others)
    if (response.choices && response.choices[0]?.message?.content) {
      return response.choices[0].message.content;
    }
  }
  
  return '';
}

// ============================================================================
// Endpoint: /api/{version}/testdriver/input
// Converts natural language to YAML test commands
// ============================================================================

app.post('/api/:version/testdriver/input', upload.single('image'), async (req, res) => {
  logger.info('Received /input request');
  
  try {
    const { input, mousePosition, activeWindow, stream = false } = req.body;
    const screenshot = req.file?.buffer ? req.file.buffer.toString('base64') : req.body.image;
    
    logger.debug('Input data:', { input, mousePosition, activeWindow, hasScreenshot: !!screenshot });

    // Build system prompt for TestDriver command generation
    const systemPrompt = `You are an expert test automation assistant for TestDriver.ai, a vision-based testing framework.

Your task is to convert natural language test instructions into executable YAML commands.

Available Commands:
- hover-text: Find and interact with text on screen
  Syntax: { command: hover-text, text: "button text", action: click|hover|double-click }

- hover-image: Find UI elements by matching images
  Syntax: { command: hover-image, image: "template.png", action: click }

- type: Keyboard input
  Syntax: { command: type, text: "content to type", delay: 50 }

- press: Press keyboard keys
  Syntax: { command: press, key: "Enter", modifiers: ["Control"] }

- click: Mouse click at coordinates
  Syntax: { command: click, x: 100, y: 200, button: left|right }

- scroll: Scroll the page
  Syntax: { command: scroll, direction: up|down|left|right, amount: 100 }

- wait: Delay execution
  Syntax: { command: wait, duration: 1000 }

- assert: Verify state/condition
  Syntax: { command: assert, expect: "description of expected state" }

- exec-js: Execute JavaScript
  Syntax: { command: exec-js, script: "document.title" }

- match-image: Verify screenshot matches template
  Syntax: { command: match-image, image: "expected.png", threshold: 0.9 }

Current Context:
- Mouse Position: ${mousePosition ? JSON.stringify(mousePosition) : 'Unknown'}
- Active Window: ${activeWindow || 'Unknown'}

Output Format:
Return ONLY a markdown code block containing YAML commands:

\`\`\`yaml
- command: hover-text
  text: "Sign In"
  action: click
- command: type
  text: "user@example.com"
- command: assert
  expect: "login successful"
\`\`\`

Be concise. Focus on the exact task requested.`;

    // Build user message with vision
    const userContent = [
      { type: 'text', text: input }
    ];

    if (screenshot) {
      const processedImage = await processScreenshot(screenshot);
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${processedImage}` }
      });
    }

    const messages = [
      { role: 'user', content: userContent }
    ];

    // Call LLM
    const response = await callLLM(messages, systemPrompt, stream);
    const textContent = extractTextContent(response);

    logger.debug('LLM Response:', textContent);

    // Format response for TestDriver (expects markdown with YAML code blocks)
    const formattedResponse = {
      markdown: textContent,
      raw: response
    };

    res.json(formattedResponse);
    
  } catch (error) {
    logger.error('Error in /input:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Endpoint: /api/{version}/testdriver/error
// AI-powered error recovery and healing
// ============================================================================

app.post('/api/:version/testdriver/error', upload.single('image'), async (req, res) => {
  logger.info('Received /error request');
  
  try {
    const { error, previousCommands, mousePosition, activeWindow } = req.body;
    const screenshot = req.file?.buffer ? req.file.buffer.toString('base64') : req.body.image;

    const systemPrompt = `You are an expert debugging assistant for TestDriver.ai test automation.

When tests fail, your job is to analyze the error and provide corrective YAML commands.

Analysis Guidelines:
1. Understand what went wrong from the error message
2. Look at the screenshot to see the current state
3. Consider what commands were previously attempted
4. Suggest alternative approaches or corrections

Common Error Scenarios:
- Element not found → Try different text/description, check visibility
- Click failed → Verify coordinates, check if element is clickable
- Timeout → Add wait commands, check loading states
- Assertion failed → Re-evaluate expected state

Output Format:
Provide corrected YAML commands in a markdown code block:

\`\`\`yaml
- command: wait
  duration: 2000
- command: hover-text
  text: "alternative button text"
  action: click
\`\`\`

Include a brief explanation of what went wrong and how you're fixing it.`;

    const userContent = [
      { 
        type: 'text', 
        text: `Error encountered:\n${error}\n\nPrevious commands:\n${JSON.stringify(previousCommands, null, 2)}\n\nPlease provide corrected commands.`
      }
    ];

    if (screenshot) {
      const processedImage = await processScreenshot(screenshot);
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${processedImage}` }
      });
    }

    const messages = [{ role: 'user', content: userContent }];
    const response = await callLLM(messages, systemPrompt);
    const textContent = extractTextContent(response);

    res.json({ markdown: textContent, raw: response });
    
  } catch (error) {
    logger.error('Error in /error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Endpoint: /api/{version}/testdriver/check
// Verify task completion by comparing screenshots
// ============================================================================

app.post('/api/:version/testdriver/check', upload.fields([
  { name: 'before', maxCount: 1 },
  { name: 'after', maxCount: 1 }
]), async (req, res) => {
  logger.info('Received /check request');
  
  try {
    const { task, expect } = req.body;
    const beforeImage = req.files?.before?.[0]?.buffer.toString('base64') || req.body.before;
    const afterImage = req.files?.after?.[0]?.buffer.toString('base64') || req.body.after;

    const systemPrompt = `You are a quality assurance expert for TestDriver.ai.

Your task is to verify if a test action was successful by comparing before/after screenshots.

Analysis Steps:
1. Examine the "before" screenshot - what was the initial state?
2. Examine the "after" screenshot - what changed?
3. Does the change match the expected outcome?
4. Provide a clear pass/fail verdict with reasoning

Output Format:
{
  "success": true/false,
  "reason": "clear explanation of what happened",
  "changes_detected": ["list", "of", "visible changes"],
  "confidence": 0.0-1.0
}`;

    const userContent = [
      { 
        type: 'text', 
        text: `Task: ${task}\nExpected outcome: ${expect || 'Verify successful completion'}\n\nPlease compare the before/after screenshots and determine if the task succeeded.`
      }
    ];

    if (beforeImage) {
      const processed = await processScreenshot(beforeImage);
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${processed}` }
      });
    }

    if (afterImage) {
      const processed = await processScreenshot(afterImage);
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${processed}` }
      });
    }

    const messages = [{ role: 'user', content: userContent }];
    const response = await callLLM(messages, systemPrompt);
    const textContent = extractTextContent(response);

    // Try to parse as JSON, fallback to text response
    let result;
    try {
      result = JSON.parse(textContent);
    } catch {
      result = {
        success: textContent.toLowerCase().includes('pass') || textContent.toLowerCase().includes('success'),
        reason: textContent,
        confidence: 0.8
      };
    }

    res.json(result);
    
  } catch (error) {
    logger.error('Error in /check:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Endpoint: /api/{version}/testdriver/generate
// Generate test ideas and scenarios
// ============================================================================

app.post('/api/:version/testdriver/generate', upload.single('image'), async (req, res) => {
  logger.info('Received /generate request');
  
  try {
    const { context, type = 'test-ideas' } = req.body;
    const screenshot = req.file?.buffer ? req.file.buffer.toString('base64') : req.body.image;

    const systemPrompt = `You are a test design expert for TestDriver.ai.

Your task is to generate comprehensive test scenarios based on the provided context and screenshot.

Test Generation Guidelines:
1. Identify key user flows and interactions
2. Cover happy paths and edge cases
3. Include visual verification points
4. Consider accessibility and error states
5. Suggest data-driven test variations

Output Format:
Return a JSON array of test suggestions:

[
  {
    "title": "Test login with valid credentials",
    "description": "Verify successful login flow",
    "priority": "high",
    "steps": [
      "Navigate to login page",
      "Enter valid username",
      "Enter valid password",
      "Click login button",
      "Verify dashboard appears"
    ],
    "assertions": [
      "User is redirected to dashboard",
      "Welcome message displays username"
    ]
  }
]`;

    const userContent = [
      { 
        type: 'text', 
        text: `Context: ${context}\n\nGenerate comprehensive test scenarios for this application.`
      }
    ];

    if (screenshot) {
      const processed = await processScreenshot(screenshot);
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${processed}` }
      });
    }

    const messages = [{ role: 'user', content: userContent }];
    const response = await callLLM(messages, systemPrompt);
    const textContent = extractTextContent(response);

    // Try to parse as JSON array
    let testIdeas;
    try {
      testIdeas = JSON.parse(textContent);
    } catch {
      // Fallback: wrap in array
      testIdeas = [{ title: 'Generated Test', description: textContent }];
    }

    res.json({ tests: testIdeas });
    
  } catch (error) {
    logger.error('Error in /generate:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Endpoint: /api/{version}/testdriver/assert
// Natural language assertion verification
// ============================================================================

app.post('/api/:version/testdriver/assert', upload.single('image'), async (req, res) => {
  logger.info('Received /assert request');
  
  try {
    const { assertion, context } = req.body;
    const screenshot = req.file?.buffer ? req.file.buffer.toString('base64') : req.body.image;

    const systemPrompt = `You are an assertion verification expert for TestDriver.ai.

Your task is to evaluate if a natural language assertion is true based on the current screenshot.

Evaluation Guidelines:
1. Parse the assertion statement carefully
2. Examine the screenshot for evidence
3. Look for exact matches or reasonable interpretations
4. Be strict but not pedantic

Output Format:
{
  "passed": true/false,
  "reason": "clear explanation",
  "evidence": "what you observed in the screenshot",
  "confidence": 0.0-1.0
}`;

    const userContent = [
      { 
        type: 'text', 
        text: `Assertion: "${assertion}"\nContext: ${context || 'None'}\n\nDoes the current screenshot satisfy this assertion?`
      }
    ];

    if (screenshot) {
      const processed = await processScreenshot(screenshot);
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${processed}` }
      });
    }

    const messages = [{ role: 'user', content: userContent }];
    const response = await callLLM(messages, systemPrompt);
    const textContent = extractTextContent(response);

    let result;
    try {
      result = JSON.parse(textContent);
    } catch {
      result = {
        passed: textContent.toLowerCase().includes('true') || textContent.toLowerCase().includes('pass'),
        reason: textContent,
        confidence: 0.75
      };
    }

    res.json(result);
    
  } catch (error) {
    logger.error('Error in /assert:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Endpoint: /api/{version}/testdriver/hover/text
// Find text on screen and return coordinates
// ============================================================================

app.post('/api/:version/testdriver/hover/text', upload.single('image'), async (req, res) => {
  logger.info('Received /hover/text request');
  
  try {
    const { text, description } = req.body;
    const screenshot = req.file?.buffer ? req.file.buffer.toString('base64') : req.body.image;

    const systemPrompt = `You are a computer vision expert for TestDriver.ai.

Your task is to locate text on a screenshot and provide precise click coordinates.

Analysis Steps:
1. Find the specified text: "${text}"
2. Consider the description: "${description || 'No additional context'}"
3. If multiple matches, choose the most prominent/relevant one
4. Calculate the center point coordinates
5. Provide confidence score

IMPORTANT: Screenshot dimensions are typically 1920x1080 or similar.
Coordinates should be pixel positions from top-left (0,0).

Output Format:
{
  "found": true/false,
  "x": pixel_x_coordinate,
  "y": pixel_y_coordinate,
  "confidence": 0.0-1.0,
  "reason": "explanation of what was found and where"
}`;

    const userContent = [
      { 
        type: 'text', 
        text: `Find text: "${text}"\nDescription: ${description || 'None'}\n\nProvide coordinates to click this text.`
      }
    ];

    if (screenshot) {
      const processed = await processScreenshot(screenshot);
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${processed}` }
      });
    }

    const messages = [{ role: 'user', content: userContent }];
    const response = await callLLM(messages, systemPrompt);
    const textContent = extractTextContent(response);

    let result;
    try {
      result = JSON.parse(textContent);
    } catch {
      result = {
        found: false,
        reason: 'Could not parse coordinates from response',
        raw: textContent
      };
    }

    res.json(result);
    
  } catch (error) {
    logger.error('Error in /hover/text:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Endpoint: /api/{version}/testdriver/hover/image
// Find image template on screen and return coordinates
// ============================================================================

app.post('/api/:version/testdriver/hover/image', upload.fields([
  { name: 'screenshot', maxCount: 1 },
  { name: 'template', maxCount: 1 }
]), async (req, res) => {
  logger.info('Received /hover/image request');
  
  try {
    const { description } = req.body;
    const screenshot = req.files?.screenshot?.[0]?.buffer.toString('base64') || req.body.screenshot;
    const template = req.files?.template?.[0]?.buffer.toString('base64') || req.body.template;

    const systemPrompt = `You are a computer vision expert for TestDriver.ai.

Your task is to locate a template image within a larger screenshot.

Analysis Steps:
1. Identify the template image pattern
2. Search for matches in the screenshot
3. Find the best match location
4. Calculate center coordinates
5. Provide confidence score

Description context: ${description || 'None'}

Output Format:
{
  "found": true/false,
  "x": pixel_x_coordinate,
  "y": pixel_y_coordinate,
  "confidence": 0.0-1.0,
  "matches": [{"x": X, "y": Y, "score": 0.0-1.0}],
  "reason": "explanation"
}`;

    const userContent = [
      { 
        type: 'text', 
        text: `Find the template image within the screenshot.\nDescription: ${description || 'None'}\n\nProvide coordinates of the best match.`
      }
    ];

    if (template) {
      const processed = await processScreenshot(template);
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${processed}` }
      });
      userContent.push({ type: 'text', text: '^ Template image to find' });
    }

    if (screenshot) {
      const processed = await processScreenshot(screenshot);
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${processed}` }
      });
      userContent.push({ type: 'text', text: '^ Screenshot to search in' });
    }

    const messages = [{ role: 'user', content: userContent }];
    const response = await callLLM(messages, systemPrompt);
    const textContent = extractTextContent(response);

    let result;
    try {
      result = JSON.parse(textContent);
    } catch {
      result = {
        found: false,
        reason: 'Could not parse coordinates from response',
        raw: textContent
      };
    }

    res.json(result);
    
  } catch (error) {
    logger.error('Error in /hover/image:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Health Check & Info Endpoints
// ============================================================================

app.get('/health', async (req, res) => {
  const startTime = Date.now();
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    environment: {
      node: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: 'MB'
      }
    },
    config: {
      provider: config.apiProvider,
      model: config.model,
      apiBaseUrl: config.apiBaseUrl,
      port: config.port
    },
    dependencies: {
      apiEndpoint: { status: 'unknown', message: 'Not checked (use /health/full for deep check)' }
    }
  };

  // Quick health check (no API call)
  const responseTime = Date.now() - startTime;
  healthStatus.responseTime = `${responseTime}ms`;
  
  res.json(healthStatus);
});

// Deep health check with API connectivity test
app.get('/health/full', async (req, res) => {
  const startTime = Date.now();
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    environment: {
      node: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: 'MB'
      }
    },
    config: {
      provider: config.apiProvider,
      model: config.model,
      apiBaseUrl: config.apiBaseUrl,
      port: config.port
    },
    dependencies: {}
  };

  // Test API connectivity
  try {
    const testMessages = [{ role: 'user', content: 'Test connection - respond with OK' }];
    const testStart = Date.now();
    await callLLM(testMessages, null, false, 1); // Single retry for health check
    const testTime = Date.now() - testStart;
    
    healthStatus.dependencies.apiEndpoint = {
      status: 'healthy',
      responseTime: `${testTime}ms`,
      message: 'API endpoint is reachable and responding'
    };
  } catch (error) {
    healthStatus.status = 'degraded';
    healthStatus.dependencies.apiEndpoint = {
      status: 'unhealthy',
      error: error.message,
      message: 'API endpoint is not reachable'
    };
  }

  const responseTime = Date.now() - startTime;
  healthStatus.responseTime = `${responseTime}ms`;
  
  res.json(healthStatus);
});

app.get('/', (req, res) => {
  res.json({
    name: 'TestDriver.ai Proxy Server',
    version: '1.0.0',
    description: 'Proxy server to use TestDriver.ai with custom LLM APIs',
    endpoints: [
      'POST /api/:version/testdriver/input - Convert natural language to YAML commands',
      'POST /api/:version/testdriver/error - AI-powered error recovery',
      'POST /api/:version/testdriver/check - Verify task completion',
      'POST /api/:version/testdriver/generate - Generate test scenarios',
      'POST /api/:version/testdriver/assert - Natural language assertions',
      'POST /api/:version/testdriver/hover/text - Find text coordinates',
      'POST /api/:version/testdriver/hover/image - Find image coordinates',
      'GET /health - Health check'
    ],
    config: {
      provider: config.apiProvider,
      model: config.model,
      apiBaseUrl: config.apiBaseUrl
    }
  });
});

// ============================================================================
// Error Handling
// ============================================================================

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    stack: config.debug ? err.stack : undefined
  });
});

// ============================================================================
// Start Server
// ============================================================================

const server = app.listen(config.port, () => {
  logger.info(`
  ╔════════════════════════════════════════════════════════════════╗
  ║                                                                ║
  ║           🤖 TestDriver.ai Proxy Server Started 🚀            ║
  ║                                                                ║
  ╠════════════════════════════════════════════════════════════════╣
  ║                                                                ║
  ║  Server URL:    http://localhost:${config.port.toString().padEnd(40)}║
  ║  API Provider:  ${config.apiProvider.padEnd(47)}║
  ║  Model:         ${config.model.padEnd(47)}║
  ║  Max Tokens:    ${config.maxTokens.toString().padEnd(47)}║
  ║                                                                ║
  ╠════════════════════════════════════════════════════════════════╣
  ║                                                                ║
  ║  Usage with TestDriver.ai CLI:                                ║
  ║                                                                ║
  ║  TD_API_ROOT=http://localhost:${config.port} npx testdriverai run test.yaml  ║
  ║                                                                ║
  ║  Available Endpoints: 7                                        ║
  ║    ✓ /input      - Natural language → YAML commands           ║
  ║    ✓ /error      - Error recovery & healing                   ║
  ║    ✓ /check      - Task verification                          ║
  ║    ✓ /generate   - Test generation                            ║
  ║    ✓ /assert     - Assertion verification                     ║
  ║    ✓ /hover/text - Text coordinate finding                    ║
  ║    ✓ /hover/image - Image template matching                   ║
  ║                                                                ║
  ╚════════════════════════════════════════════════════════════════╝
  `);
  
  logger.info('Proxy server is ready to receive requests');
  logger.info(`Test it: curl http://localhost:${config.port}/health`);
});

// Handle server startup errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${config.port} is already in use`);
    logger.error(`💡 Solutions:`);
    logger.error(`   1. Stop the process using the port: lsof -ti:${config.port} | xargs kill`);
    logger.error(`   2. Use a different port: PORT=8090 npm start`);
    logger.error(`   3. Set PORT in .env file`);
    process.exit(1);
  } else if (error.code === 'EACCES') {
    logger.error(`❌ Permission denied to bind to port ${config.port}`);
    logger.error(`💡 Use a port >= 1024 or run with elevated permissions`);
    process.exit(1);
  } else {
    logger.error('❌ Server startup error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;
