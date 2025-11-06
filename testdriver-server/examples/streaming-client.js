#!/usr/bin/env node

/**
 * Real-Time Streaming Client Example
 * 
 * This example demonstrates how to use the WebSocket interface
 * to monitor live test execution with real-time streaming.
 * 
 * Usage:
 *   node streaming-client.js <sessionId>
 * 
 * Example:
 *   node streaming-client.js my-test-session-123
 */

const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const SERVER_URL = process.env.TD_API_ROOT || 'http://localhost:3001';
const WS_URL = process.env.TD_WS_URL || 'ws://localhost:3001';
const SESSION_ID = process.argv[2];

if (!SESSION_ID) {
  console.error('❌ Error: Session ID is required');
  console.error('Usage: node streaming-client.js <sessionId>');
  process.exit(1);
}

console.log('🎬 TestDriver Streaming Client');
console.log('===============================');
console.log(`Server: ${SERVER_URL}`);
console.log(`WebSocket: ${WS_URL}`);
console.log(`Session ID: ${SESSION_ID}`);
console.log('===============================\n');

// Statistics
const stats = {
  eventsReceived: 0,
  screenshotsCaptured: 0,
  domSnapshotsCaptured: 0,
  logsCaptured: 0,
  stepCompleted: 0,
  stepsFailed: 0,
  startTime: Date.now()
};

// Socket.IO client
const socket = io(WS_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10
});

// API client
const api = axios.create({
  baseURL: `${SERVER_URL}/api/v1`,
  timeout: 10000
});

async function startStreaming() {
  try {
    console.log('📡 Starting streaming for session...');
    const response = await api.post(`/sessions/${SESSION_ID}/stream/start`);
    
    if (response.data.success) {
      console.log('✅ Streaming started successfully');
      console.log(`   Stream ID: ${response.data.stream.id}`);
      console.log(`   WebSocket URL: ${response.data.stream.websocketUrl}\n`);
      return true;
    } else {
      console.error('❌ Failed to start streaming:', response.data.error);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️  Session not found, creating new session...');
      return true; // Continue anyway
    }
    console.error('❌ Error starting streaming:', error.message);
    return false;
  }
}

async function stopStreaming() {
  try {
    console.log('\n📡 Stopping streaming...');
    const response = await api.post(`/sessions/${SESSION_ID}/stream/stop`);
    
    if (response.data.success) {
      console.log('✅ Streaming stopped successfully');
      console.log(`   Duration: ${response.data.stream.duration}ms`);
      console.log(`   Events: ${response.data.stream.eventCount}`);
    }
  } catch (error) {
    console.error('❌ Error stopping streaming:', error.message);
  }
}

async function getStreamStatus() {
  try {
    const response = await api.get(`/sessions/${SESSION_ID}/stream/status`);
    
    if (response.data.success) {
      console.log('📊 Stream Status:');
      console.log(`   Active: ${response.data.stream.isActive}`);
      console.log(`   Paused: ${response.data.stream.isPaused}`);
      console.log(`   Connected Clients: ${response.data.stream.connectedClients}`);
      console.log(`   Events: ${response.data.stream.eventCount}`);
      console.log(`   Duration: ${response.data.stream.duration}ms\n`);
    }
  } catch (error) {
    // Ignore errors for status check
  }
}

function printStats() {
  const duration = (Date.now() - stats.startTime) / 1000;
  console.log('\n📊 Session Statistics');
  console.log('====================');
  console.log(`Duration: ${duration.toFixed(1)}s`);
  console.log(`Events Received: ${stats.eventsReceived}`);
  console.log(`Steps Completed: ${stats.stepCompleted}`);
  console.log(`Steps Failed: ${stats.stepsFailed}`);
  console.log(`Screenshots: ${stats.screenshotsCaptured}`);
  console.log(`DOM Snapshots: ${stats.domSnapshotsCaptured}`);
  console.log(`Logs: ${stats.logsCaptured}`);
  console.log(`Events/sec: ${(stats.eventsReceived / duration).toFixed(2)}`);
  console.log('====================\n');
}

// Connection handlers
socket.on('connect', async () => {
  console.log('✅ Connected to WebSocket server');
  console.log(`📡 Socket ID: ${socket.id}\n`);

  // Start streaming
  const started = await startStreaming();
  if (!started) {
    console.error('❌ Failed to start streaming, exiting...');
    process.exit(1);
  }

  // Join session room
  socket.emit('join-session', { sessionId: SESSION_ID }, (response) => {
    if (response && response.success) {
      console.log(`✅ Joined session: ${SESSION_ID}`);
      console.log('👂 Listening for streaming events...\n');
      
      // Get initial status
      getStreamStatus();
    }
  });
});

socket.on('disconnect', (reason) => {
  console.log(`\n❌ Disconnected: ${reason}`);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`\n✅ Reconnected after ${attemptNumber} attempts`);
  socket.emit('join-session', { sessionId: SESSION_ID });
});

// Event handlers - track all events
socket.on('event', (event) => {
  stats.eventsReceived++;
  
  // Print event summary
  const shortData = JSON.stringify(event.data).substring(0, 100);
  console.log(`[${new Date(event.timestamp).toLocaleTimeString()}] ${event.type}`);
  console.log(`   → ${shortData}${shortData.length >= 100 ? '...' : ''}`);
});

// Specific streaming events
socket.on('exploration.step.completed', (data) => {
  stats.stepCompleted++;
  console.log(`\n✅ Step ${data.stepNumber} Completed`);
  console.log(`   Command: ${data.command}`);
  console.log(`   Duration: ${data.durationMs}ms`);
});

socket.on('exploration.step.failed', (data) => {
  stats.stepsFailed++;
  console.log(`\n❌ Step Failed`);
  console.log(`   Error: ${data.error}`);
});

socket.on('recording.screenshot.captured', (data) => {
  stats.screenshotsCaptured++;
  console.log(`📸 Screenshot captured (#${stats.screenshotsCaptured})`);
});

socket.on('recording.dom.captured', (data) => {
  stats.domSnapshotsCaptured++;
  console.log(`🌳 DOM snapshot captured (#${stats.domSnapshotsCaptured})`);
});

socket.on('recording.log.captured', (data) => {
  stats.logsCaptured++;
  console.log(`📝 Log captured: ${data.level} - ${data.message.substring(0, 50)}`);
});

socket.on('streaming.client.connected', (data) => {
  console.log(`\n📡 New client connected: ${data.clientId}`);
  getStreamStatus();
});

socket.on('streaming.client.disconnected', (data) => {
  console.log(`\n📡 Client disconnected: ${data.clientId}`);
});

// Print stats every 10 seconds
setInterval(() => {
  if (stats.eventsReceived > 0) {
    printStats();
  }
}, 10000);

// Graceful shutdown
async function shutdown() {
  console.log('\n\n👋 Shutting down...');
  printStats();
  await stopStreaming();
  socket.emit('leave-session', { sessionId: SESSION_ID });
  socket.disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('Press Ctrl+C to exit\n');
console.log('🎥 Streaming session started. Waiting for events...\n');

