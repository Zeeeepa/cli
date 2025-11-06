#!/usr/bin/env node

/**
 * Recording Client Example
 * 
 * This example demonstrates how to control session recording
 * via the REST API and monitor recording events via WebSocket.
 * 
 * Usage:
 *   node recording-client.js <command> <sessionId>
 * 
 * Commands:
 *   start <sessionId>     - Start recording
 *   stop <sessionId>      - Stop recording
 *   status <sessionId>    - Get recording status
 *   download <sessionId>  - Download recording
 *   delete <sessionId>    - Delete recording
 *   monitor <sessionId>   - Monitor recording in real-time
 * 
 * Examples:
 *   node recording-client.js start my-session-123
 *   node recording-client.js monitor my-session-123
 */

const io = require('socket.io-client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const SERVER_URL = process.env.TD_API_ROOT || 'http://localhost:3001';
const WS_URL = process.env.TD_WS_URL || 'ws://localhost:3001';

const command = process.argv[2];
const sessionId = process.argv[3];

if (!command || !sessionId) {
  console.error('❌ Error: Command and Session ID are required');
  console.error('Usage: node recording-client.js <command> <sessionId>');
  console.error('\nCommands: start, stop, status, download, delete, monitor');
  process.exit(1);
}

console.log('🎥 TestDriver Recording Client');
console.log('===============================');
console.log(`Server: ${SERVER_URL}`);
console.log(`Session ID: ${sessionId}`);
console.log(`Command: ${command}`);
console.log('===============================\n');

// API client
const api = axios.create({
  baseURL: `${SERVER_URL}/api/v1`,
  timeout: 30000
});

// Recording commands
async function startRecording() {
  try {
    console.log('🎬 Starting recording...');
    const response = await api.post(`/sessions/${sessionId}/recording/start`, {
      options: {
        captureScreenshots: true,
        captureDom: true,
        captureLogs: true,
        screenshotInterval: 1000
      }
    });
    
    if (response.data.success) {
      console.log('✅ Recording started successfully');
      console.log(`   Recording ID: ${response.data.recording.id}`);
      console.log(`   Started At: ${response.data.recording.startedAt}`);
      console.log(`   Output Dir: ${response.data.recording.outputDir}\n`);
      
      console.log('💡 Tip: Use "monitor" command to watch recording in real-time');
    } else {
      console.error('❌ Failed to start recording:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error || error.message);
  }
}

async function stopRecording() {
  try {
    console.log('⏹️  Stopping recording...');
    const response = await api.post(`/sessions/${sessionId}/recording/stop`);
    
    if (response.data.success) {
      console.log('✅ Recording stopped successfully');
      console.log(`   Recording ID: ${response.data.recording.id}`);
      console.log(`   Duration: ${response.data.recording.duration}ms`);
      console.log(`   Events: ${response.data.recording.eventCount}`);
      console.log(`   Output Path: ${response.data.recording.outputPath}\n`);
      
      console.log('💡 Tip: Use "download" command to download the recording');
    } else {
      console.error('❌ Failed to stop recording:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error || error.message);
  }
}

async function getStatus() {
  try {
    console.log('📊 Fetching recording status...');
    const response = await api.get(`/sessions/${sessionId}/recording/status`);
    
    if (response.data.success) {
      const rec = response.data.recording;
      console.log('\n📊 Recording Status');
      console.log('==================');
      console.log(`Recording ID: ${rec.id}`);
      console.log(`Is Recording: ${rec.isRecording ? '🔴 YES' : '⚪ NO'}`);
      console.log(`Started At: ${rec.startedAt}`);
      console.log(`Duration: ${(rec.duration / 1000).toFixed(1)}s`);
      console.log(`Events: ${rec.eventCount}`);
      console.log(`Screenshots: ${rec.screenshotCount}`);
      console.log(`Output Dir: ${rec.outputDir}`);
      console.log('==================\n');
    } else {
      console.log('ℹ️  No active recording found for this session');
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️  No active recording found for this session');
    } else {
      console.error('❌ Error:', error.response?.data?.error || error.message);
    }
  }
}

async function getMetadata() {
  try {
    console.log('📋 Fetching recording metadata...');
    const response = await api.get(`/sessions/${sessionId}/recording/metadata`);
    
    if (response.data.success) {
      const meta = response.data.metadata;
      console.log('\n📋 Recording Metadata');
      console.log('====================');
      console.log(`Recording ID: ${meta.recordingId}`);
      console.log(`Session ID: ${meta.sessionId}`);
      console.log(`Started: ${meta.startedAt}`);
      console.log(`Stopped: ${meta.stoppedAt || 'Still recording'}`);
      console.log(`Duration: ${(meta.duration / 1000).toFixed(1)}s`);
      console.log(`Events: ${meta.eventCount}`);
      console.log(`Screenshots: ${meta.screenshotCount}`);
      console.log(`Output Path: ${meta.outputPath}`);
      console.log(`File Size: ${(meta.fileSize / 1024 / 1024).toFixed(2)} MB`);
      console.log('====================\n');
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️  Recording not found');
    } else {
      console.error('❌ Error:', error.response?.data?.error || error.message);
    }
  }
}

async function downloadRecording() {
  try {
    console.log('⬇️  Downloading recording...');
    const response = await api.get(`/sessions/${sessionId}/recording/download`);
    
    if (response.data.success) {
      console.log('📦 Download Information');
      console.log(`   Download URL: ${response.data.downloadUrl}`);
      console.log('\n💡 Note: File streaming not implemented in this example');
      console.log('   In production, you would stream the file to disk here\n');
      
      // Print metadata
      if (response.data.metadata) {
        await getMetadata();
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error || error.message);
  }
}

async function deleteRecording() {
  try {
    console.log('🗑️  Deleting recording...');
    const response = await api.delete(`/sessions/${sessionId}/recording`);
    
    if (response.data.success) {
      console.log('✅ Recording deleted successfully');
      console.log(`   Deleted Files: ${response.data.deletedFiles}\n`);
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error || error.message);
  }
}

async function monitorRecording() {
  console.log('👀 Monitoring recording in real-time...\n');
  
  // Check if recording is active
  try {
    await getStatus();
  } catch (err) {
    // Ignore
  }
  
  const socket = io(WS_URL, {
    transports: ['websocket'],
    reconnection: true
  });

  const stats = {
    events: 0,
    screenshots: 0,
    domSnapshots: 0,
    logs: 0,
    startTime: Date.now()
  };

  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket server\n');
    socket.emit('join-session', { sessionId });
  });

  socket.on('event', (event) => {
    stats.events++;
  });

  socket.on('recording.started', (data) => {
    console.log('\n🎬 Recording Started');
    console.log(`   Session: ${data.sessionId}`);
    console.log(`   Output: ${data.outputDir}\n`);
  });

  socket.on('recording.screenshot.captured', (data) => {
    stats.screenshots++;
    console.log(`📸 Screenshot #${stats.screenshots} captured (${data.size} bytes)`);
  });

  socket.on('recording.dom.captured', (data) => {
    stats.domSnapshots++;
    console.log(`🌳 DOM snapshot #${stats.domSnapshots} captured (${data.size} bytes)`);
  });

  socket.on('recording.log.captured', (data) => {
    stats.logs++;
    console.log(`📝 Log #${stats.logs}: [${data.level}] ${data.message.substring(0, 60)}`);
  });

  socket.on('recording.stopped', (data) => {
    console.log('\n⏹️  Recording Stopped');
    console.log(`   Session: ${data.sessionId}`);
    console.log(`   Events: ${data.eventCount}`);
    console.log(`   Screenshots: ${data.screenshotCount}`);
    console.log(`   Output: ${data.outputPath}\n`);
    
    printMonitorStats();
    process.exit(0);
  });

  function printMonitorStats() {
    const duration = (Date.now() - stats.startTime) / 1000;
    console.log('\n📊 Monitoring Statistics');
    console.log('=======================');
    console.log(`Duration: ${duration.toFixed(1)}s`);
    console.log(`Events: ${stats.events}`);
    console.log(`Screenshots: ${stats.screenshots}`);
    console.log(`DOM Snapshots: ${stats.domSnapshots}`);
    console.log(`Logs: ${stats.logs}`);
    console.log('=======================\n');
  }

  // Print stats every 10 seconds
  setInterval(() => {
    if (stats.events > 0) {
      printMonitorStats();
    }
  }, 10000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping monitor...');
    printMonitorStats();
    socket.disconnect();
    process.exit(0);
  });

  console.log('👂 Listening for recording events...');
  console.log('Press Ctrl+C to exit\n');
}

// Execute command
(async () => {
  try {
    switch (command.toLowerCase()) {
      case 'start':
        await startRecording();
        break;
      case 'stop':
        await stopRecording();
        break;
      case 'status':
        await getStatus();
        break;
      case 'metadata':
        await getMetadata();
        break;
      case 'download':
        await downloadRecording();
        break;
      case 'delete':
        await deleteRecording();
        break;
      case 'monitor':
        await monitorRecording();
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.error('Valid commands: start, stop, status, download, delete, monitor');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
})();

