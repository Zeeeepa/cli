/**
 * Cloudflare Worker for TestDriver.ai Server
 * 
 * Exposes test.pixelium.uk as the base TestDriver URL
 * Proxies all requests to the backend testdriver-server
 * 
 * Features:
 * - Request proxying with proper headers
 * - WebSocket support for real-time streaming
 * - CORS handling
 * - Error handling and logging
 * - Health check endpoint
 * - Rate limiting (optional)
 */

// Configuration - Set these in Cloudflare Workers environment variables
const CONFIG = {
  // Backend server URL (your actual testdriver-server)
  BACKEND_URL: 'https://your-backend-server.com', // Set via environment variable
  
  // Alternatively, if using Cloudflare Tunnel:
  // BACKEND_URL: 'https://your-tunnel-id.cfargotunnel.com'
  
  // CORS Configuration
  CORS_ORIGINS: ['*'], // Set specific origins in production
  
  // Rate limiting (requests per minute per IP)
  RATE_LIMIT: 100,
  RATE_LIMIT_ENABLED: false, // Enable in production
  
  // Timeout for backend requests (milliseconds)
  TIMEOUT: 30000,
  
  // Logging
  DEBUG: true
};

// Rate limiting store (in-memory, resets on worker restart)
const rateLimitStore = new Map();

/**
 * Main request handler
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Handle incoming request
 */
async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request);
    }
    
    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/cloudflare-health') {
      return new Response(JSON.stringify({
        status: 'ok',
        worker: 'testdriver-cloudflare-proxy',
        timestamp: new Date().toISOString(),
        backend: CONFIG.BACKEND_URL
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders(request)
        }
      });
    }
    
    // Rate limiting check
    if (CONFIG.RATE_LIMIT_ENABLED) {
      const rateLimitResponse = checkRateLimit(request);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }
    
    // Check for WebSocket upgrade
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      return handleWebSocket(request);
    }
    
    // Proxy regular HTTP request
    return await proxyRequest(request);
    
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders(request)
      }
    });
  }
}

/**
 * Proxy HTTP request to backend
 */
async function proxyRequest(request) {
  const url = new URL(request.url);
  
  // Construct backend URL
  const backendUrl = new URL(CONFIG.BACKEND_URL);
  backendUrl.pathname = url.pathname;
  backendUrl.search = url.search;
  
  // Clone request headers
  const headers = new Headers(request.headers);
  
  // Add/modify headers for backend
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || 'unknown');
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
  headers.set('X-Forwarded-Host', url.hostname);
  headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || 'unknown');
  
  // Create proxied request
  const proxiedRequest = new Request(backendUrl.toString(), {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'follow'
  });
  
  if (CONFIG.DEBUG) {
    console.log('Proxying request:', backendUrl.toString());
  }
  
  try {
    const response = await fetch(proxiedRequest);
    const modifiedResponse = new Response(response.body, response);
    
    // Add CORS headers
    const corsHeaders = getCORSHeaders(request);
    for (const [key, value] of Object.entries(corsHeaders)) {
      modifiedResponse.headers.set(key, value);
    }
    
    modifiedResponse.headers.set('X-Proxy-By', 'testdriver-cloudflare');
    
    return modifiedResponse;
    
  } catch (error) {
    console.error('Error proxying request:', error);
    return new Response(JSON.stringify({
      error: 'Backend Error',
      message: 'Failed to connect to backend server',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders(request)
      }
    });
  }
}

/**
 * Handle WebSocket connection
 */
function handleWebSocket(request) {
  const url = new URL(request.url);
  const backendUrl = new URL(CONFIG.BACKEND_URL);
  backendUrl.protocol = backendUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  backendUrl.pathname = url.pathname;
  backendUrl.search = url.search;
  
  const [client, server] = Object.values(new WebSocketPair());
  const backendWs = new WebSocket(backendUrl.toString());
  
  client.addEventListener('message', event => {
    if (backendWs.readyState === WebSocket.OPEN) {
      backendWs.send(event.data);
    }
  });
  
  backendWs.addEventListener('message', event => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(event.data);
    }
  });
  
  backendWs.addEventListener('close', event => {
    client.close(event.code, event.reason);
  });
  
  client.addEventListener('close', event => {
    backendWs.close(event.code, event.reason);
  });
  
  client.accept();
  
  return new Response(null, {
    status: 101,
    webSocket: server
  });
}

/**
 * Handle CORS preflight request
 */
function handleCORS(request) {
  return new Response(null, {
    headers: getCORSHeaders(request)
  });
}

/**
 * Get CORS headers
 */
function getCORSHeaders(request) {
  const origin = request.headers.get('Origin');
  const allowOrigin = CONFIG.CORS_ORIGINS.includes('*') || CONFIG.CORS_ORIGINS.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': allowOrigin ? (origin || '*') : CONFIG.CORS_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400'
  };
}

/**
 * Check rate limit for request
 */
function checkRateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const windowStart = now - 60000;
  
  let entry = rateLimitStore.get(ip);
  if (!entry) {
    entry = { requests: [] };
    rateLimitStore.set(ip, entry);
  }
  
  entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
  
  if (entry.requests.length >= CONFIG.RATE_LIMIT) {
    return new Response(JSON.stringify({
      error: 'Rate Limit Exceeded',
      message: `Maximum ${CONFIG.RATE_LIMIT} requests per minute`
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...getCORSHeaders(request) }
    });
  }
  
  entry.requests.push(now);
  return null;
}

// Export for ES modules
export default {
  async fetch(request, env, ctx) {
    if (env.BACKEND_URL) CONFIG.BACKEND_URL = env.BACKEND_URL;
    if (env.CORS_ORIGINS) CONFIG.CORS_ORIGINS = env.CORS_ORIGINS.split(',');
    if (env.RATE_LIMIT) CONFIG.RATE_LIMIT = parseInt(env.RATE_LIMIT);
    if (env.RATE_LIMIT_ENABLED) CONFIG.RATE_LIMIT_ENABLED = env.RATE_LIMIT_ENABLED === 'true';
    if (env.TIMEOUT) CONFIG.TIMEOUT = parseInt(env.TIMEOUT);
    if (env.DEBUG) CONFIG.DEBUG = env.DEBUG === 'true';
    
    return handleRequest(request);
  }
};
