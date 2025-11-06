#!/usr/bin/env node

/**
 * Basic WebSocket Client Example
 * 
 * This example demonstrates how to connect to the TestDriver WebSocket server
 * and receive real-time events for a session.
 * 
 * Usage:
 *   node websocket-client.js [sessionId]
 * 
 * Example:
 *   node websocket-client.js my-test-session-123
 */

const io = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');

// Configuration
const SERVER_URL = process.env.TD_WS_URL || 'ws://localhost:3001';
const SESSION_ID = process.argv[2] || uuidv4();

console.log('🚀 TestDriver WebSocket Client');
console.log('================================');
console.log(`Server: ${SERVER_URL}`);
console.log(`Session ID: ${SESSION_ID}`);
console.log('================================\n');

// Create Socket.IO client
const socket = io(SERVER_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000
});

// Connection handlers
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log(`📡 Socket ID: ${socket.id}\n`);

  // Join session room
  socket.emit('join-session', { sessionId: SESSION_ID }, (response) => {
    if (response && response.success) {
      console.log(`✅ Joined session: ${SESSION_ID}\n`);
      console.log('👂 Listening for events...\n');
    } else {
      console.error('❌ Failed to join session:', response?.error || 'Unknown error');
    }
  });
});

socket.on('disconnect', (reason) => {
  console.log(`\n❌ Disconnected: ${reason}`);
  if (reason === 'io server disconnect') {
    // Server initiated disconnect, manually reconnect
    socket.connect();
  }
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`\n✅ Reconnected after ${attemptNumber} attempts`);
  // Re-join session
  socket.emit('join-session', { sessionId: SESSION_ID });
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
});

socket.on('reconnect_error', (error) => {
  console.error(`❌ Reconnection error: ${error.message}`);
});

socket.on('reconnect_failed', () => {
  console.error('❌ Reconnection failed - max attempts reached');
});

socket.on('connect_error', (error) => {
  console.error(`❌ Connection error: ${error.message}`);
});

// Event handlers
socket.on('event', (event) => {
  console.log(`\n📨 Event Received: ${event.type}`);
  console.log(`   Timestamp: ${event.timestamp}`);
  console.log(`   Event ID: ${event.id}`);
  console.log(`   Data:`, JSON.stringify(event.data, null, 2));
});

// Specific event type handlers
socket.on('test.generation.started', (data) => {
  console.log(`\n🎬 Test Generation Started`);
  console.log(`   Session: ${data.sessionId}`);
  console.log(`   Description: ${data.description}`);
  console.log(`   Platform: ${data.platform}`);
});

socket.on('test.generation.completed', (data) => {
  console.log(`\n✅ Test Generation Completed`);
  console.log(`   Session: ${data.sessionId}`);
  console.log(`   Steps: ${data.stepCount}`);
  console.log(`   Duration: ${data.durationMs}ms`);
});

socket.on('test.generation.failed', (data) => {
  console.log(`\n❌ Test Generation Failed`);
  console.log(`   Session: ${data.sessionId}`);
  console.log(`   Error: ${data.error}`);
});

socket.on('exploration.started', (data) => {
  console.log(`\n🔍 Exploration Started`);
  console.log(`   Session: ${data.sessionId}`);
  console.log(`   Prompt: ${data.prompt}`);
});

socket.on('exploration.step.completed', (data) => {
  console.log(`\n✅ Exploration Step Completed`);
  console.log(`   Session: ${data.sessionId}`);
  console.log(`   Step: ${data.stepNumber}`);
  console.log(`   Command: ${data.command}`);
});

socket.on('session.created', (data) => {
  console.log(`\n🆕 Session Created`);
  console.log(`   Session: ${data.sessionId}`);
  console.log(`   Type: ${data.sessionType}`);
});

socket.on('recording.started', (data) => {
  console.log(`\n🎥 Recording Started`);
  console.log(`   Session: ${data.sessionId}`);
});

socket.on('recording.stopped', (data) => {
  console.log(`\n⏹️  Recording Stopped`);
  console.log(`   Session: ${data.sessionId}`);
  console.log(`   Events: ${data.eventCount}`);
  console.log(`   Screenshots: ${data.screenshotCount}`);
});

socket.on('streaming.client.connected', (data) => {
  console.log(`\n📡 Streaming Client Connected`);
  console.log(`   Session: ${data.sessionId}`);
  console.log(`   Client ID: ${data.clientId}`);
});

// Error handlers
socket.on('error', (error) => {
  console.error(`\n❌ Socket Error: ${error}`);
});

socket.on('session-error', (data) => {
  console.error(`\n❌ Session Error: ${data.message}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  socket.emit('leave-session', { sessionId: SESSION_ID });
  socket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  socket.disconnect();
  process.exit(0);
});

// Keep process alive
console.log('Press Ctrl+C to exit\n');

