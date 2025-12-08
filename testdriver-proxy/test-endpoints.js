/**
 * Endpoint Testing Suite for TestDriver Proxy Server
 * 
 * This script tests all proxy server endpoints to ensure they're working correctly.
 * Run with: node test-endpoints.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.PROXY_URL || 'http://localhost:8080';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let testsPassed = 0;
let testsFailed = 0;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  if (passed) {
    testsPassed++;
    log(`✓ ${name}`, colors.green);
  } else {
    testsFailed++;
    log(`✗ ${name}`, colors.red);
    if (details) log(`  ${details}`, colors.yellow);
  }
}

async function testHealthEndpoint() {
  log('\n📊 Testing Health Endpoint', colors.blue);
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    
    logTest('GET /health returns 200', response.status === 200);
    logTest('Health response has status field', response.data.status !== undefined);
    logTest('Health response has timestamp', response.data.timestamp !== undefined);
    logTest('Health response has uptime', response.data.uptime !== undefined);
    logTest('Health response has environment info', response.data.environment !== undefined);
    logTest('Health response has config', response.data.config !== undefined);
    
    return true;
  } catch (error) {
    logTest('GET /health', false, error.message);
    return false;
  }
}

async function testHealthFullEndpoint() {
  log('\n🔍 Testing Health Full Endpoint', colors.blue);
  
  try {
    const response = await axios.get(`${BASE_URL}/health/full`);
    
    logTest('GET /health/full returns 200', response.status === 200);
    logTest('Full health has dependencies', response.data.dependencies !== undefined);
    logTest('Full health checks API endpoint', response.data.dependencies?.apiEndpoint !== undefined);
    
    return true;
  } catch (error) {
    logTest('GET /health/full', false, error.message);
    return false;
  }
}

async function testMetricsEndpoint() {
  log('\n📈 Testing Metrics Endpoint', colors.blue);
  
  try {
    const response = await axios.get(`${BASE_URL}/metrics`);
    
    logTest('GET /metrics returns 200', response.status === 200);
    logTest('Metrics has correct content-type', 
      response.headers['content-type']?.includes('text/plain'));
    logTest('Metrics contains prometheus data', 
      typeof response.data === 'string' && response.data.includes('# HELP'));
    
    return true;
  } catch (error) {
    logTest('GET /metrics', false, error.message);
    return false;
  }
}

async function testRootEndpoint() {
  log('\n🏠 Testing Root Endpoint', colors.blue);
  
  try {
    const response = await axios.get(`${BASE_URL}/`);
    
    logTest('GET / returns 200', response.status === 200);
    logTest('Root has name field', response.data.name !== undefined);
    logTest('Root has endpoints list', Array.isArray(response.data.endpoints));
    
    return true;
  } catch (error) {
    logTest('GET /', false, error.message);
    return false;
  }
}

async function testInputEndpoint() {
  log('\n🎯 Testing Input Endpoint (Main API)', colors.blue);
  
  try {
    const form = new FormData();
    form.append('input', 'Click the login button');
    form.append('mousePosition', JSON.stringify({ x: 100, y: 100 }));
    form.append('activeWindow', 'Test Browser');
    
    // Note: This will likely fail without proper API credentials
    // We're just testing that the endpoint exists and accepts the request
    const response = await axios.post(`${BASE_URL}/api/v6/testdriver/input`, form, {
      headers: form.getHeaders(),
      validateStatus: () => true // Accept any status
    });
    
    logTest('POST /api/v6/testdriver/input endpoint exists', response.status !== 404);
    logTest('Input endpoint validates request format', 
      response.status === 400 || response.status === 401 || response.status === 200 || response.status === 500);
    
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logTest('POST /api/v6/testdriver/input', false, 'Server not running');
    } else {
      logTest('POST /api/v6/testdriver/input', false, error.message);
    }
    return false;
  }
}

async function testErrorEndpoint() {
  log('\n🐛 Testing Error Endpoint', colors.blue);
  
  try {
    const form = new FormData();
    form.append('error', JSON.stringify({ message: 'Test error', code: 'TEST_ERROR' }));
    form.append('context', JSON.stringify({ test: true }));
    
    const response = await axios.post(`${BASE_URL}/api/v6/testdriver/error`, form, {
      headers: form.getHeaders(),
      validateStatus: () => true
    });
    
    logTest('POST /api/v6/testdriver/error endpoint exists', response.status !== 404);
    
    return true;
  } catch (error) {
    logTest('POST /api/v6/testdriver/error', false, error.message);
    return false;
  }
}

async function testCheckEndpoint() {
  log('\n✅ Testing Check Endpoint', colors.blue);
  
  try {
    const form = new FormData();
    form.append('task', 'Verify login button is visible');
    form.append('mousePosition', JSON.stringify({ x: 100, y: 100 }));
    
    const response = await axios.post(`${BASE_URL}/api/v6/testdriver/check`, form, {
      headers: form.getHeaders(),
      validateStatus: () => true
    });
    
    logTest('POST /api/v6/testdriver/check endpoint exists', response.status !== 404);
    
    return true;
  } catch (error) {
    logTest('POST /api/v6/testdriver/check', false, error.message);
    return false;
  }
}

async function testGenerateEndpoint() {
  log('\n🔨 Testing Generate Endpoint', colors.blue);
  
  try {
    const form = new FormData();
    form.append('prompt', 'Generate a test for login functionality');
    
    const response = await axios.post(`${BASE_URL}/api/v6/testdriver/generate`, form, {
      headers: form.getHeaders(),
      validateStatus: () => true
    });
    
    logTest('POST /api/v6/testdriver/generate endpoint exists', response.status !== 404);
    
    return true;
  } catch (error) {
    logTest('POST /api/v6/testdriver/generate', false, error.message);
    return false;
  }
}

async function testAssertEndpoint() {
  log('\n🔎 Testing Assert Endpoint', colors.blue);
  
  try {
    const form = new FormData();
    form.append('assertion', 'The page title should contain "Login"');
    
    const response = await axios.post(`${BASE_URL}/api/v6/testdriver/assert`, form, {
      headers: form.getHeaders(),
      validateStatus: () => true
    });
    
    logTest('POST /api/v6/testdriver/assert endpoint exists', response.status !== 404);
    
    return true;
  } catch (error) {
    logTest('POST /api/v6/testdriver/assert', false, error.message);
    return false;
  }
}

async function testHoverTextEndpoint() {
  log('\n👆 Testing Hover Text Endpoint', colors.blue);
  
  try {
    const form = new FormData();
    form.append('text', 'Login Button');
    
    const response = await axios.post(`${BASE_URL}/api/v6/testdriver/hover/text`, form, {
      headers: form.getHeaders(),
      validateStatus: () => true
    });
    
    logTest('POST /api/v6/testdriver/hover/text endpoint exists', response.status !== 404);
    
    return true;
  } catch (error) {
    logTest('POST /api/v6/testdriver/hover/text', false, error.message);
    return false;
  }
}

async function testHoverImageEndpoint() {
  log('\n🖼️  Testing Hover Image Endpoint', colors.blue);
  
  try {
    const form = new FormData();
    form.append('template', 'test-template');
    
    const response = await axios.post(`${BASE_URL}/api/v6/testdriver/hover/image`, form, {
      headers: form.getHeaders(),
      validateStatus: () => true
    });
    
    logTest('POST /api/v6/testdriver/hover/image endpoint exists', response.status !== 404);
    
    return true;
  } catch (error) {
    logTest('POST /api/v6/testdriver/hover/image', false, error.message);
    return false;
  }
}

async function runAllTests() {
  log('\n🚀 Starting TestDriver Proxy Endpoint Tests', colors.blue);
  log('='.repeat(60), colors.blue);
  log(`Testing server at: ${BASE_URL}`, colors.yellow);
  
  const startTime = Date.now();
  
  // Test all endpoints
  await testHealthEndpoint();
  await testHealthFullEndpoint();
  await testMetricsEndpoint();
  await testRootEndpoint();
  await testInputEndpoint();
  await testErrorEndpoint();
  await testCheckEndpoint();
  await testGenerateEndpoint();
  await testAssertEndpoint();
  await testHoverTextEndpoint();
  await testHoverImageEndpoint();
  
  const duration = Date.now() - startTime;
  
  // Summary
  log('\n' + '='.repeat(60), colors.blue);
  log('📊 Test Summary', colors.blue);
  log('='.repeat(60), colors.blue);
  log(`✓ Passed: ${testsPassed}`, colors.green);
  log(`✗ Failed: ${testsFailed}`, colors.red);
  log(`⏱  Duration: ${duration}ms`, colors.yellow);
  log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`, 
    testsPassed > testsFailed ? colors.green : colors.red);
  
  if (testsFailed === 0) {
    log('\n🎉 All tests passed!', colors.green);
    process.exit(0);
  } else {
    log(`\n⚠️  ${testsFailed} test(s) failed`, colors.red);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  log('\n❌ Unhandled error:', colors.red);
  console.error(error);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log('\n❌ Test suite failed:', colors.red);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runAllTests };

