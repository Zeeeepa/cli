# WebSocket Documentation

This document describes how to connect to the TestDriver Server's WebSocket interface for real-time event streaming and session monitoring.

## Overview

The TestDriver Server uses **Socket.IO** for WebSocket communication, providing:
- Real-time event streaming for test sessions
- Live test execution viewing
- Session recording notifications
- Bi-directional communication

## Connection

### Connection URL

#### Local Development
```
ws://localhost:3001
```

#### Production (via Cloudflare Worker)
```
wss://test.pixelium.uk
```

### Socket.IO Client Setup

```javascript
const io = require('socket.io-client');

const socket = io('ws://localhost:3001', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

## Authentication

### Session Binding

To receive events for a specific session, join the session's room:

```javascript
socket.emit('join-session', {
  sessionId: 'your-session-id',
  clientId: 'your-client-id' // optional
});
```

### Room Types

The WebSocket service supports multiple room types:

1. **Session Rooms** - `session:${sessionId}`
   - Receive all events for a specific session
   - Join with: `socket.emit('join-session', { sessionId })`

2. **Type-based Rooms** - `type:${eventType}`
   - Receive all events of a specific type
   - Join with: `socket.emit('join-type', { eventType })`

3. **Broadcast Room** - `all`
   - Receive all events (admin use)
   - Join with: `socket.emit('join-all')`

## Event Subscription

### Subscribing to Events

```javascript
// Subscribe to all events for a session
socket.on('event', (event) => {
  console.log('Received event:', event);
  // {
  //   id: 'event-uuid',
  //   type: 'test.generation.started',
  //   timestamp: '2024-01-01T12:00:00.000Z',
  //   data: { sessionId, ... }
  // }
});

// Subscribe to specific event types
socket.on('test.generation.started', (data) => {
  console.log('Test generation started:', data);
});

socket.on('test.generation.completed', (data) => {
  console.log('Test generation completed:', data);
});
```

### Event Types

The server emits 40+ event types across multiple categories:

#### Test Generation Events
- `test.generation.started`
- `test.generation.completed`
- `test.generation.failed`
- `command.generation.started`
- `command.generation.completed`
- `command.generation.failed`

#### Exploration Events
- `exploration.started`
- `exploration.step.completed`
- `exploration.step.failed`

#### Session Events
- `session.created`
- `session.deleted`
- `session.snapshot.created`
- `session.snapshot.restored`

#### Persistence Events
- `test.saved`
- `test.loaded`
- `test.deleted`

#### Validation Events
- `validation.started`
- `validation.completed`
- `validation.failed`

#### Recording Events
- `recording.started`
- `recording.stopped`
- `recording.screenshot.captured`
- `recording.dom.captured`
- `recording.log.captured`

#### Streaming Events
- `streaming.started`
- `streaming.stopped`
- `streaming.client.connected`
- `streaming.client.disconnected`

## Message Format

### Event Structure

All events follow this structure:

```typescript
interface Event {
  id: string;              // Unique event ID (UUID)
  type: string;            // Event type (e.g., 'test.generation.started')
  timestamp: Date;         // Event timestamp
  data: object;            // Event-specific data
  metadata?: {             // Optional metadata
    sessionId?: string;
    requestId?: string;
    source?: string;
  }
}
```

### Example Events

#### Test Generation Started
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "test.generation.started",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "data": {
    "sessionId": "session-123",
    "requestId": "req-456",
    "description": "Login test",
    "platform": "web",
    "hasScreenshot": true
  }
}
```

#### Test Generation Completed
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "type": "test.generation.completed",
  "timestamp": "2024-01-01T12:00:05.000Z",
  "data": {
    "sessionId": "session-123",
    "requestId": "req-456",
    "testYaml": "version: 1.0\nsteps: ...",
    "stepCount": 5,
    "durationMs": 5000
  }
}
```

## Connection Lifecycle

### 1. Connect

```javascript
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  console.log('Socket ID:', socket.id);
});
```

### 2. Join Session Room

```javascript
socket.emit('join-session', { 
  sessionId: 'your-session-id' 
});

socket.on('joined-session', (data) => {
  console.log('Joined session:', data.sessionId);
});
```

### 3. Receive Events

```javascript
socket.on('event', (event) => {
  console.log('Event received:', event.type);
  // Process event
});
```

### 4. Leave Session Room

```javascript
socket.emit('leave-session', { 
  sessionId: 'your-session-id' 
});

socket.on('left-session', (data) => {
  console.log('Left session:', data.sessionId);
});
```

### 5. Disconnect

```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Manual disconnect
socket.disconnect();
```

## Reconnection Strategy

### Automatic Reconnection

Socket.IO handles automatic reconnection by default:

```javascript
const socket = io('ws://localhost:3001', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Re-join session rooms
  socket.emit('join-session', { sessionId: 'your-session-id' });
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection error:', error);
});

socket.on('reconnect_failed', () => {
  console.error('Reconnection failed');
});
```

## Error Handling

### Connection Errors

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  // Possible reasons:
  // - Server is down
  // - Network issues
  // - Invalid URL
});

socket.on('connect_timeout', () => {
  console.error('Connection timeout');
});
```

### Event Errors

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Custom error events
socket.on('session-error', (data) => {
  console.error('Session error:', data.message);
});
```

## Advanced Usage

### Multiple Session Monitoring

```javascript
const sessions = ['session-1', 'session-2', 'session-3'];

sessions.forEach(sessionId => {
  socket.emit('join-session', { sessionId });
});

socket.on('event', (event) => {
  const sessionId = event.data.sessionId;
  console.log(`Event for session ${sessionId}:`, event.type);
});
```

### Type-based Filtering

```javascript
// Only receive test generation events
socket.emit('join-type', { eventType: 'test.generation.*' });

socket.on('test.generation.started', (data) => {
  console.log('Generation started:', data.sessionId);
});

socket.on('test.generation.completed', (data) => {
  console.log('Generation completed:', data.sessionId);
});
```

### Event Acknowledgment

```javascript
socket.emit('join-session', { sessionId: 'abc' }, (response) => {
  if (response.success) {
    console.log('Joined session successfully');
  } else {
    console.error('Failed to join session:', response.error);
  }
});
```

## Performance Considerations

### Connection Pooling

For high-traffic scenarios, consider connection pooling:

```javascript
class WebSocketPool {
  constructor(maxConnections = 10) {
    this.connections = [];
    this.maxConnections = maxConnections;
  }

  getConnection() {
    if (this.connections.length < this.maxConnections) {
      const socket = io('ws://localhost:3001');
      this.connections.push(socket);
      return socket;
    }
    // Round-robin selection
    return this.connections[
      Math.floor(Math.random() * this.connections.length)
    ];
  }
}
```

### Event Batching

For high-frequency events, consider batching:

```javascript
const eventBuffer = [];
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 1000;

socket.on('event', (event) => {
  eventBuffer.push(event);
  
  if (eventBuffer.length >= BATCH_SIZE) {
    processBatch(eventBuffer.splice(0, BATCH_SIZE));
  }
});

setInterval(() => {
  if (eventBuffer.length > 0) {
    processBatch(eventBuffer.splice(0));
  }
}, BATCH_INTERVAL);
```

## Security

### Transport Security

Always use WSS (WebSocket Secure) in production:

```javascript
const socket = io('wss://test.pixelium.uk', {
  secure: true,
  rejectUnauthorized: true
});
```

### Authentication Tokens

If authentication is required:

```javascript
const socket = io('wss://test.pixelium.uk', {
  auth: {
    token: 'your-auth-token'
  }
});
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```
Error: connect ECONNREFUSED
```
**Solution:** Check if server is running on the correct port

#### 2. Timeout
```
Error: timeout
```
**Solution:** Increase timeout or check network connectivity

#### 3. No Events Received
**Solution:** Ensure you've joined the correct session room

#### 4. Duplicate Events
**Solution:** Check for multiple socket connections or subscriptions

### Debugging

Enable Socket.IO debug logging:

```javascript
localStorage.debug = 'socket.io-client:*';

const socket = io('ws://localhost:3001', {
  reconnection: true
});
```

## Examples

See the `examples/` directory for complete working examples:
- `websocket-client.js` - Basic WebSocket client
- `streaming-client.js` - Real-time streaming viewer
- `recording-client.js` - Recording session monitor

## API Reference

### Client Events (Emit)

| Event | Data | Description |
|-------|------|-------------|
| `join-session` | `{ sessionId }` | Join a session room |
| `leave-session` | `{ sessionId }` | Leave a session room |
| `join-type` | `{ eventType }` | Join type-based room |
| `join-all` | `{}` | Join broadcast room |

### Server Events (On)

| Event | Data | Description |
|-------|------|-------------|
| `event` | `Event` | Any event |
| `joined-session` | `{ sessionId }` | Joined session successfully |
| `left-session` | `{ sessionId }` | Left session successfully |
| `connect` | - | Connected to server |
| `disconnect` | `reason` | Disconnected from server |
| `reconnect` | `attemptNumber` | Reconnected to server |
| `error` | `Error` | General error |

## Support

For issues or questions:
- GitHub Issues: https://github.com/Zeeeepa/cli/issues
- Documentation: https://github.com/Zeeeepa/cli/blob/main/testdriver-server/README.md

